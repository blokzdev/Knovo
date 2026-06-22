import { z } from "zod";
import { authenticateWorker } from "@/lib/worker-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit, err, json, slugify, type Db } from "@/lib/worker-api";

const body = z.object({
  title: z.string().min(1),
  summary: z.string().optional(),
  slug: z.string().optional(),
  artifactIds: z.array(z.string().uuid()).default([]),
});

// POST /worker/series — create a series (collection) and optionally attach artifacts in order,
// for the 'make_series' directive. Series are public-readable; membership is set on artifacts.
export async function POST(req: Request) {
  const worker = authenticateWorker(req);
  if (!worker) return err(401, "unauthorized", "Missing or invalid worker token.");
  if (!worker.can("series")) return err(403, "forbidden", `Worker '${worker.id}' cannot manage series.`);

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err(400, "bad_request", parsed.error.issues.map((i) => i.message).join("; "));
  const { title, summary, artifactIds } = parsed.data;

  const db = createAdminClient();
  const slug = await uniqueSeriesSlug(db, parsed.data.slug ?? title);
  const { data: series, error: insErr } = await db
    .from("series")
    .insert({ slug, title, summary: summary ?? null })
    .select("id, slug")
    .single();
  if (insErr || !series) return err(500, "series_write_failed", insErr?.message ?? "series insert failed");

  for (let i = 0; i < artifactIds.length; i++) {
    await db.from("artifacts").update({ series_id: series.id, series_order: i }).eq("id", artifactIds[i]);
  }

  await audit(db, `worker:${worker.id}`, "series_create", null, { series_id: series.id, attached: artifactIds.length });
  return json({ id: series.id, slug: series.slug }, 201);
}

// Series have their own slug namespace; resolve uniqueness against the series table.
async function uniqueSeriesSlug(db: Db, base: string): Promise<string> {
  const root = slugify(base);
  const { data } = await db.from("series").select("slug").like("slug", `${root}%`);
  const taken = new Set((data ?? []).map((r) => r.slug));
  if (!taken.has(root)) return root;
  for (let i = 2; i < 1000; i++) if (!taken.has(`${root}-${i}`)) return `${root}-${i}`;
  return `${root}-${Date.now().toString(36)}`;
}
