"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "./guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/worker-api";
import { fireWorker, type WorkerId } from "@/lib/routines";
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

// Fire a worker routine on demand (dashboard "run now"). Returns the session URL to watch.
export async function dispatchWorker(input: {
  worker: WorkerId;
  text?: string;
  artifactId?: string;
}): Promise<{ ok: true; sessionUrl: string } | { ok: false; error: string }> {
  try {
    const { user } = await requireAdmin();
    const res = await fireWorker(input.worker, input.text);
    const db = createAdminClient();
    await audit(db, `admin:${user.id}`, `dispatch:${input.worker}`, input.artifactId ?? null, {
      session: res.claude_code_session_id,
    });
    if (input.artifactId) revalidateArtifact(input.artifactId);
    return { ok: true, sessionUrl: res.claude_code_session_url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to dispatch." };
  }
}
