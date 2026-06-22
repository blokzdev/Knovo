import { authenticateWorker } from "@/lib/worker-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { err, json } from "@/lib/worker-api";

export const dynamic = "force-dynamic";

// GET /worker/queue — the Editor's work queue: open admin directives/comments paired with
// their artifact. The Editor reads this each run (scheduled sweep or dashboard-fired) and acts.
export async function GET(req: Request) {
  const worker = authenticateWorker(req);
  if (!worker) return err(401, "unauthorized", "Missing or invalid worker token.");
  if (!worker.can("queue")) return err(403, "forbidden", `Worker '${worker.id}' cannot read the queue.`);

  const db = createAdminClient();
  const { data, error } = await db
    .from("comments")
    .select("id, body, directive, created_at, artifact:artifacts(id, slug, title, status, deleted_at)")
    .eq("status", "open")
    .order("created_at", { ascending: true });
  if (error) return err(500, "queue_read_failed", error.message);

  type Row = {
    id: string;
    body: string | null;
    directive: string | null;
    created_at: string;
    artifact: { id: string; slug: string; title: string; status: string; deleted_at: string | null } | null;
  };
  const items = ((data ?? []) as unknown as Row[])
    .filter((r) => r.artifact && r.artifact.deleted_at === null)
    .map((r) => ({
      comment_id: r.id,
      directive: r.directive,
      note: r.body,
      created_at: r.created_at,
      artifact: r.artifact && {
        id: r.artifact.id,
        slug: r.artifact.slug,
        title: r.artifact.title,
        status: r.artifact.status,
      },
    }));
  return json({ items });
}
