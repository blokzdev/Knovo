import { z } from "zod";
import { authenticateWorker } from "@/lib/worker-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  audit,
  editLiveAuthorized,
  err,
  json,
  openDirectives,
  snapshotRevision,
} from "@/lib/worker-api";
import { CURRENT_SCHEMA_VERSION, safeParseArtifactDoc } from "@/lib/artifact-schema";

const body = z.object({
  doc: z.record(z.string(), z.unknown()),
  note: z.string().optional(),
});

// PATCH /worker/artifacts/:id — update an artifact's content in place. Re-validates the slot
// document, snapshots the prior version to revisions (recoverability), and audits. Editing an
// already-PUBLISHED artifact additionally requires an open admin directive (enhance/revise).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const worker = authenticateWorker(req);
  if (!worker) return err(401, "unauthorized", "Missing or invalid worker token.");
  if (!worker.can("update")) return err(403, "forbidden", `Worker '${worker.id}' cannot update.`);

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err(400, "bad_request", parsed.error.issues.map((i) => i.message).join("; "));
  const { doc, note } = parsed.data;

  const db = createAdminClient();
  const { data: current, error: readErr } = await db
    .from("artifacts")
    .select("id, schema_version, doc, title, summary, status, deleted_at")
    .eq("id", params.id)
    .maybeSingle();
  if (readErr) return err(500, "read_failed", readErr.message);
  if (!current || current.deleted_at) return err(404, "not_found", "Artifact not found.");

  if (current.status === "published") {
    const directives = await openDirectives(db, current.id);
    if (!editLiveAuthorized(directives)) {
      return err(403, "needs_directive", "Editing a published artifact requires an admin directive (enhance/revise).");
    }
  }

  const version = Number((doc as { schemaVersion?: number }).schemaVersion ?? CURRENT_SCHEMA_VERSION);
  const docCheck = safeParseArtifactDoc(version, doc);
  if (!docCheck.success) {
    const message =
      typeof docCheck.error === "string"
        ? docCheck.error
        : docCheck.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return err(422, "invalid_document", message);
  }
  const validDoc = docCheck.data;

  // Snapshot the prior version before overwriting.
  await snapshotRevision(db, current, `worker:${worker.id}`, note);

  const { error: updErr } = await db
    .from("artifacts")
    .update({
      doc: validDoc as never,
      title: validDoc.title,
      summary: validDoc.summary,
      schema_version: version,
      last_worker: `worker:${worker.id}`,
    })
    .eq("id", current.id);
  if (updErr) return err(500, "update_failed", updErr.message);

  await audit(db, `worker:${worker.id}`, "update", current.id, { note: note ?? null });
  return json({ id: current.id, status: current.status });
}
