import { z } from "zod";
import { authenticateWorker } from "@/lib/worker-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit, err, json } from "@/lib/worker-api";

const body = z.object({
  note: z.string().min(1),
  severity: z.enum(["info", "warn", "critical"]).default("info"),
});

// POST /worker/artifacts/:id/flag — a worker raises an issue for the ADMIN (e.g. Keeper finds a
// cited source was retracted/updated). This is the worker→admin channel: it creates an OPEN
// comment with no action and no publish_after, so it surfaces in the dashboard but never loops
// back into the worker queue. The admin then decides (e.g. directs a reverify + publish_after).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const worker = authenticateWorker(req);
  if (!worker) return err(401, "unauthorized", "Missing or invalid worker token.");
  if (!worker.can("flag")) return err(403, "forbidden", `Worker '${worker.id}' cannot flag.`);

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err(400, "bad_request", parsed.error.issues.map((i) => i.message).join("; "));
  const { note, severity } = parsed.data;

  const db = createAdminClient();
  const { data: artifact, error: readErr } = await db
    .from("artifacts")
    .select("id, deleted_at")
    .eq("id", params.id)
    .maybeSingle();
  if (readErr) return err(500, "read_failed", readErr.message);
  if (!artifact || artifact.deleted_at) return err(404, "not_found", "Artifact not found.");

  const { data: comment, error: insErr } = await db
    .from("comments")
    .insert({
      artifact_id: artifact.id,
      note,
      action: null,
      publish_after: false,
      status: "open",
      options: { raised_by: `worker:${worker.id}`, severity } as never,
    })
    .select("id")
    .single();
  if (insErr || !comment) return err(500, "flag_write_failed", insErr?.message ?? "flag insert failed");

  await audit(db, `worker:${worker.id}`, `flag:${severity}`, artifact.id, { comment_id: comment.id });
  return json({ id: comment.id, severity }, 201);
}
