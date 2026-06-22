import { z } from "zod";
import { authenticateWorker } from "@/lib/worker-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit, err, json } from "@/lib/worker-api";

const body = z.object({
  disposition: z.enum(["addressed", "dismissed"]).default("addressed"),
});

// POST /worker/comments/:id/resolve — mark an admin directive/comment handled, so it leaves
// the Editor's queue. The dashboard shows the disposition + which worker closed it.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const worker = authenticateWorker(req);
  if (!worker) return err(401, "unauthorized", "Missing or invalid worker token.");
  if (!worker.can("resolve")) return err(403, "forbidden", `Worker '${worker.id}' cannot resolve comments.`);

  const parsed = body.safeParse(await req.json().catch(() => ({})));
  const disposition = parsed.success ? parsed.data.disposition : "addressed";

  const db = createAdminClient();
  const { data: comment, error: readErr } = await db
    .from("comments")
    .select("id, artifact_id")
    .eq("id", params.id)
    .maybeSingle();
  if (readErr) return err(500, "read_failed", readErr.message);
  if (!comment) return err(404, "not_found", "Comment not found.");

  const { error: updErr } = await db
    .from("comments")
    .update({
      status: disposition,
      addressed_at: new Date().toISOString(),
      addressed_by: `worker:${worker.id}`,
    })
    .eq("id", comment.id);
  if (updErr) return err(500, "update_failed", updErr.message);

  await audit(db, `worker:${worker.id}`, `comment:${disposition}`, comment.artifact_id, { comment_id: comment.id });
  return json({ id: comment.id, status: disposition });
}
