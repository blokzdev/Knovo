"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "./guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/worker-api";
import { fireWorker, type WorkerId } from "@/lib/routines";
import { isAllowedFireUrl, FIRE_URL_REQUIREMENT } from "@/lib/routine-url";
import type { Database } from "@/lib/database.types";

type Status = Database["public"]["Enums"]["artifact_status"];
type DirectiveAction = Database["public"]["Enums"]["directive_action"];
type Result = { ok: true } | { ok: false; error: string };

function revalidateArtifact(id: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/library");
  revalidatePath(`/admin/a/${id}`);
}

// Leave an editorial directive/comment on an artifact (the worker queue reads these).
export async function addDirective(input: {
  artifactId: string;
  note: string;
  action: DirectiveAction | null;
  publishAfter: boolean;
}): Promise<Result> {
  try {
    const { user } = await requireAdmin();
    const db = createAdminClient();
    const note = input.note.trim();
    if (!note && !input.action && !input.publishAfter) {
      return { ok: false, error: "Add a note, an action, or the publish-after flag." };
    }
    const { error } = await db.from("comments").insert({
      artifact_id: input.artifactId,
      author: user.id,
      note: note || null,
      action: input.action,
      publish_after: input.publishAfter,
      status: "open",
    });
    if (error) return { ok: false, error: error.message };
    await audit(db, `admin:${user.id}`, input.action ? `directive:${input.action}` : "comment", input.artifactId, {
      publish_after: input.publishAfter,
    });
    revalidateArtifact(input.artifactId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}

export async function resolveComment(input: {
  commentId: string;
  artifactId: string;
  disposition: "addressed" | "dismissed";
}): Promise<Result> {
  try {
    const { user } = await requireAdmin();
    const db = createAdminClient();
    const { error } = await db
      .from("comments")
      .update({ status: input.disposition, addressed_at: new Date().toISOString(), addressed_by: `admin:${user.id}` })
      .eq("id", input.commentId);
    if (error) return { ok: false, error: error.message };
    await audit(db, `admin:${user.id}`, `comment:${input.disposition}`, input.artifactId, { comment_id: input.commentId });
    revalidateArtifact(input.artifactId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}

// Admin is trusted and may set any status directly (not bound by the worker transition policy).
export async function setStatus(input: { artifactId: string; to: Status; reason?: string }): Promise<Result> {
  try {
    const { user } = await requireAdmin();
    const db = createAdminClient();
    const now = new Date().toISOString();
    const patch: Database["public"]["Tables"]["artifacts"]["Update"] = {
      status: input.to,
      reviewed_by: user.id,
      reviewed_at: now,
    };
    if (input.to === "published") patch.published_at = now;
    if (input.to === "rejected") patch.rejected_reason = input.reason ?? null;
    const { error } = await db.from("artifacts").update(patch).eq("id", input.artifactId);
    if (error) return { ok: false, error: error.message };
    await audit(db, `admin:${user.id}`, `status:${input.to}`, input.artifactId, { reason: input.reason ?? null });
    revalidateArtifact(input.artifactId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}

export async function setDeleted(input: { artifactId: string; deleted: boolean }): Promise<Result> {
  try {
    const { user } = await requireAdmin();
    const db = createAdminClient();
    const { error } = await db
      .from("artifacts")
      .update({ deleted_at: input.deleted ? new Date().toISOString() : null })
      .eq("id", input.artifactId);
    if (error) return { ok: false, error: error.message };
    await audit(db, `admin:${user.id}`, input.deleted ? "soft_delete" : "restore", input.artifactId, {});
    revalidateArtifact(input.artifactId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}

// Moderate a public reader comment (hide/remove/restore). Audited like every admin write.
export async function moderateReaderComment(input: {
  commentId: string;
  to: Database["public"]["Enums"]["reader_comment_status"];
  artifactId?: string;
  slug?: string;
}): Promise<Result> {
  try {
    const { user } = await requireAdmin();
    const db = createAdminClient();
    const { error } = await db
      .from("reader_comments")
      .update({ status: input.to })
      .eq("id", input.commentId);
    if (error) return { ok: false, error: error.message };
    await audit(db, `admin:${user.id}`, `reader_comment:${input.to}`, input.artifactId ?? null, {
      comment_id: input.commentId,
    });
    revalidatePath("/admin/moderation");
    if (input.slug) revalidatePath(`/a/${input.slug}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}

// Save a worker routine's fire trigger (dashboard BYOK config). The token is write-only from the
// UI: an empty `token` leaves the stored one unchanged; `clearToken` unsets it. The secret value is
// never echoed back and never written to the audit log (only which fields changed). See
// lib/admin/settings.ts for the masked read side.
export async function saveRoutineConfig(input: {
  worker: WorkerId;
  fireUrl: string;
  token?: string;
  clearToken?: boolean;
}): Promise<Result> {
  try {
    const { user } = await requireAdmin();
    const fireUrl = input.fireUrl.trim();
    if (fireUrl && !isAllowedFireUrl(fireUrl)) {
      return { ok: false, error: FIRE_URL_REQUIREMENT };
    }
    const db = createAdminClient();
    const row: Database["public"]["Tables"]["routine_configs"]["Insert"] = {
      worker: input.worker,
      fire_url: fireUrl || null,
      updated_by: user.id,
    };
    const token = input.token?.trim();
    const changed = ["fire_url"];
    if (input.clearToken) {
      row.token = null;
      changed.push("token:cleared");
    } else if (token) {
      row.token = token;
      changed.push("token:set");
    }
    const { error } = await db.from("routine_configs").upsert(row, { onConflict: "worker" });
    if (error) return { ok: false, error: error.message };
    await audit(db, `admin:${user.id}`, `config:routine:${input.worker}`, null, { changed });
    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}

// Save a global app setting (currently only `knovo_api_base`). Not a secret — surfaced in the
// setup guide as reference; dispatch uses each routine's fire URL, not this value.
export async function saveAppSetting(input: { key: "knovo_api_base"; value: string }): Promise<Result> {
  try {
    const { user } = await requireAdmin();
    if (input.key !== "knovo_api_base") return { ok: false, error: "Unknown setting." };
    const value = input.value.trim();
    const db = createAdminClient();
    const { error } = await db
      .from("app_settings")
      .upsert({ key: input.key, value: value || null, updated_by: user.id }, { onConflict: "key" });
    if (error) return { ok: false, error: error.message };
    await audit(db, `admin:${user.id}`, `config:app:${input.key}`, null, {});
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}

// Fire a worker routine on demand (dashboard "run now"). Opens a routine_runs row so the run + its
// Claude session is persisted and the worker's subsequent activity can be grouped under it in the
// HUD. Returns the session URL to watch.
export async function dispatchWorker(input: {
  worker: WorkerId;
  text?: string;
  artifactId?: string;
}): Promise<{ ok: true; sessionUrl: string } | { ok: false; error: string }> {
  try {
    const { user } = await requireAdmin();
    const db = createAdminClient();

    // Open a run (best-effort: tolerate a missing routine_runs table on a pre-0010 DB).
    let runId: string | null = null;
    try {
      const { data: run } = await db
        .from("routine_runs")
        .insert({
          worker: input.worker,
          status: "dispatched",
          dispatched_by: user.id,
          artifact_id: input.artifactId ?? null,
          text_context: input.text?.slice(0, 2000) ?? null,
        })
        .select("id")
        .single();
      runId = run?.id ?? null;
    } catch {
      // pre-migration / insert error — proceed without run tracking.
    }

    let res;
    try {
      res = await fireWorker(input.worker, input.text);
    } catch (e) {
      if (runId) {
        await db
          .from("routine_runs")
          .update({ status: "failed", error: e instanceof Error ? e.message : "dispatch failed", ended_at: new Date().toISOString() })
          .eq("id", runId);
      }
      throw e;
    }

    if (runId) {
      await db
        .from("routine_runs")
        .update({ session_id: res.claude_code_session_id, session_url: res.claude_code_session_url })
        .eq("id", runId);
    }
    await audit(
      db,
      `admin:${user.id}`,
      `dispatch:${input.worker}`,
      input.artifactId ?? null,
      { session: res.claude_code_session_id },
      runId,
    );
    revalidatePath("/admin");
    if (input.artifactId) revalidateArtifact(input.artifactId);
    return { ok: true, sessionUrl: res.claude_code_session_url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to dispatch." };
  }
}
