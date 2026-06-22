import { authenticateWorker } from "@/lib/worker-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { err, json } from "@/lib/worker-api";

export const dynamic = "force-dynamic";

// GET /worker/review-targets?limit=10 — the Keeper's sweep list: live published artifacts and
// their primary/supporting sources, oldest-touched first (a proxy for least-recently-checked).
// Artifacts that already have an open comment/flag are skipped so Keeper doesn't re-flag pending
// items. Keeper reverifies each source (retraction/update) and flags drift to the admin.
export async function GET(req: Request) {
  const worker = authenticateWorker(req);
  if (!worker) return err(401, "unauthorized", "Missing or invalid worker token.");
  if (!worker.can("targets")) return err(403, "forbidden", `Worker '${worker.id}' cannot read review targets.`);

  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 10) || 10, 1), 50);

  const db = createAdminClient();

  // Artifacts with an open comment are already in the admin's hands — skip them.
  const { data: openRows } = await db.from("comments").select("artifact_id").eq("status", "open");
  const busy = new Set((openRows ?? []).map((r) => r.artifact_id));

  const { data, error } = await db
    .from("artifacts")
    .select("id, slug, title, updated_at, artifact_sources(role, citation_text, source:sources(source_db, source_uid, url, title))")
    .eq("status", "published")
    .is("deleted_at", null)
    .order("updated_at", { ascending: true })
    .limit(limit + busy.size);
  if (error) return err(500, "targets_read_failed", error.message);

  type Row = {
    id: string;
    slug: string;
    title: string;
    updated_at: string;
    artifact_sources: {
      role: string;
      citation_text: string | null;
      source: { source_db: string; source_uid: string; url: string | null; title: string | null } | null;
    }[];
  };
  const items = ((data ?? []) as unknown as Row[])
    .filter((a) => !busy.has(a.id))
    .slice(0, limit)
    .map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      updated_at: a.updated_at,
      sources: (a.artifact_sources ?? [])
        .filter((s) => s.source)
        .map((s) => ({
          db: s.source!.source_db,
          uid: s.source!.source_uid,
          url: s.source!.url,
          title: s.source!.title,
          role: s.role,
          citation_text: s.citation_text,
        })),
    }));
  return json({ items });
}
