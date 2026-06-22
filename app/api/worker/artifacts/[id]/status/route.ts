import { z } from "zod";
import { authenticateWorker } from "@/lib/worker-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  archiveLiveAuthorized,
  audit,
  err,
  isWorkerTransitionAllowed,
  json,
  openDirectives,
  publishAuthorized,
  type Status,
} from "@/lib/worker-api";
import type { Database } from "@/lib/database.types";

const body = z.object({
  to: z.enum(["needs_review", "published", "archived"]),
  note: z.string().optional(),
});

// POST /worker/artifacts/:id/status — move an artifact through the workflow. Workers may only
// target needs_review / published / archived (admin owns approved/changes_requested/rejected).
// Publishing requires the human gate; archiving live content requires an admin directive.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const worker = authenticateWorker(req);
  if (!worker) return err(401, "unauthorized", "Missing or invalid worker token.");
  if (!worker.can("status")) return err(403, "forbidden", `Worker '${worker.id}' cannot transition status.`);

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err(400, "bad_request", parsed.error.issues.map((i) => i.message).join("; "));
  const to = parsed.data.to as Status;

  if (!isWorkerTransitionAllowed(to)) {
    return err(403, "transition_forbidden", `Workers cannot set status '${to}'.`);
  }

  const db = createAdminClient();
  const { data: current, error: readErr } = await db
    .from("artifacts")
    .select("id, status, deleted_at")
    .eq("id", params.id)
    .maybeSingle();
  if (readErr) return err(500, "read_failed", readErr.message);
  if (!current || current.deleted_at) return err(404, "not_found", "Artifact not found.");

  const directives = await openDirectives(db, current.id);
  if (to === "published" && !publishAuthorized(current.status as Status, directives)) {
    return err(403, "publish_not_authorized", "Publishing requires admin approval or an open directive flagged publish_after.");
  }
  if (to === "archived" && current.status === "published" && !archiveLiveAuthorized(directives)) {
    return err(403, "archive_not_authorized", "Archiving a published artifact requires an 'archive' directive.");
  }

  const patch: Database["public"]["Tables"]["artifacts"]["Update"] = {
    status: to,
    last_worker: `worker:${worker.id}`,
  };
  if (to === "published") patch.published_at = new Date().toISOString();

  const { error: updErr } = await db.from("artifacts").update(patch).eq("id", current.id);
  if (updErr) return err(500, "update_failed", updErr.message);

  await audit(db, `worker:${worker.id}`, `status:${to}`, current.id, {
    from: current.status,
    note: parsed.data.note ?? null,
  });
  return json({ id: current.id, status: to });
}
