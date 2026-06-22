import { z } from "zod";
import { authenticateWorker } from "@/lib/worker-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit, err, json, slugify, type Db } from "@/lib/worker-api";

const body = z
  .object({
    seriesId: z.string().uuid().optional(),
    title: z.string().min(1).optional(),
    summary: z.string().optional(),
    slug: z.string().optional(),
    artifactIds: z.array(z.string().uuid()).default([]),
  })
  .refine((b) => b.seriesId || b.title, {
    message: "provide seriesId (add_to_series) or title (make_series)",
  });

// POST /worker/series — create a series ('make_series') OR attach to an existing one
// ('add_to_series', via seriesId). Attached artifacts get series_id + an appended series_order.
// Series are public-readable; membership lives on the artifacts.
export async function POST(req: Request) {
  const worker = authenticateWorker(req);
  if (!worker) return err(401, "unauthorized", "Missing or invalid worker token.");
  if (!worker.can("series")) return err(403, "forbidden", `Worker '${worker.id}' cannot manage series.`);

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err(400, "bad_request", parsed.error.issues.map((i) => i.message).join("; "));
  const { seriesId, title, summary, artifactIds } = parsed.data;

  const db = createAdminClient();

  let series: { id: string; slug: string };
  let startOrder = 0;
  if (seriesId) {
    const { data: existing, error: readErr } = await db
      .from("series")
      .select("id, slug")
      .eq("id", seriesId)
      .maybeSingle();
    if (readErr) return err(500, "series_read_failed", readErr.message);
    if (!existing) return err(404, "not_found", "Series not found.");
    series = existing;
    const { count } = await db
      .from("artifacts")
      .select("id", { count: "exact", head: true })
      .eq("series_id", series.id);
    startOrder = count ?? 0;
  } else {
    const slug = await uniqueSeriesSlug(db, parsed.data.slug ?? title!);
    const { data: created, error: insErr } = await db
      .from("series")
      .insert({ slug, title: title!, summary: summary ?? null })
      .select("id, slug")
      .single();
    if (insErr || !created) return err(500, "series_write_failed", insErr?.message ?? "series insert failed");
    series = created;
  }

  for (let i = 0; i < artifactIds.length; i++) {
    await db
      .from("artifacts")
      .update({ series_id: series.id, series_order: startOrder + i })
      .eq("id", artifactIds[i]);
  }

  await audit(db, `worker:${worker.id}`, seriesId ? "series_attach" : "series_create", null, {
    series_id: series.id,
    attached: artifactIds.length,
  });
  return json({ id: series.id, slug: series.slug }, seriesId ? 200 : 201);
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
