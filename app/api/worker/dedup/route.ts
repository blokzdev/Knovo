import { z } from "zod";
import { authenticateWorker } from "@/lib/worker-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { err, json } from "@/lib/worker-api";

export const dynamic = "force-dynamic";

const body = z.object({
  sources: z
    .array(
      z.object({
        db: z.enum(["pdb", "chembl", "pubmed", "biorxiv"]),
        uid: z.string().min(1),
      }),
    )
    .min(1),
});

// POST /worker/dedup — check source keys against already-seen and previously-rejected
// findings before drafting. Returns per-key { seen, rejected }.
export async function POST(req: Request) {
  const worker = authenticateWorker(req);
  if (!worker) return err(401, "unauthorized", "Missing or invalid worker token.");
  if (!worker.can("dedup")) return err(403, "forbidden", `Worker '${worker.id}' cannot dedup.`);

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err(400, "bad_request", parsed.error.issues.map((i) => i.message).join("; "));

  const db = createAdminClient();
  const results = await Promise.all(
    parsed.data.sources.map(async (s) => {
      const [{ data: seen }, { data: rejected }] = await Promise.all([
        db.from("seen_source_keys").select("source_uid").eq("source_db", s.db).eq("source_uid", s.uid).maybeSingle(),
        db.from("rejected_source_keys").select("source_uid").eq("source_db", s.db).eq("source_uid", s.uid).maybeSingle(),
      ]);
      return { db: s.db, uid: s.uid, seen: Boolean(seen), rejected: Boolean(rejected) };
    }),
  );
  return json({ results });
}
