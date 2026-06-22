import { z } from "zod";
import { authenticateWorker } from "@/lib/worker-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  audit,
  err,
  json,
  snapshotRevision,
  uniqueSlug,
} from "@/lib/worker-api";
import { CURRENT_SCHEMA_VERSION, safeParseArtifactDoc } from "@/lib/artifact-schema";

const sourceInput = z.object({
  db: z.enum(["pdb", "chembl", "pubmed", "biorxiv"]),
  uid: z.string().min(1),
  url: z.string().optional(),
  title: z.string().optional(),
  raw_meta: z.unknown().optional(),
  role: z.enum(["primary", "supporting"]).default("supporting"),
  citation_text: z.string().optional(),
});

const createBody = z
  .object({
    doc: z.record(z.string(), z.unknown()),
    sources: z.array(sourceInput).min(1),
    slug: z.string().optional(),
  })
  .refine((b) => b.sources.some((s) => s.role === "primary"), {
    message: "at least one primary source is required",
  });

// POST /worker/artifacts — create a new DRAFT. Validates the slot document against the
// versioned zod schema (invariant #9), blocks re-drafting of seen/rejected primary sources
// (invariant #3), records provenance, snapshots an initial revision, and audits.
export async function POST(req: Request) {
  const worker = authenticateWorker(req);
  if (!worker) return err(401, "unauthorized", "Missing or invalid worker token.");
  if (!worker.can("create")) return err(403, "forbidden", `Worker '${worker.id}' cannot create.`);

  const parsed = createBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return err(400, "bad_request", parsed.error.issues.map((i) => i.message).join("; "));
  }
  const { doc, sources } = parsed.data;

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

  const db = createAdminClient();

  // Dedup the PRIMARY source against already-seen and previously-rejected findings.
  const primary = sources.find((s) => s.role === "primary")!;
  const [{ data: rejected }, { data: seen }] = await Promise.all([
    db.from("rejected_source_keys").select("source_uid").eq("source_db", primary.db).eq("source_uid", primary.uid).maybeSingle(),
    db.from("seen_source_keys").select("source_uid").eq("source_db", primary.db).eq("source_uid", primary.uid).maybeSingle(),
  ]);
  if (rejected) return err(409, "rejected_source", `Primary source ${primary.db}:${primary.uid} was previously rejected; not re-drafted.`);
  if (seen) return err(409, "duplicate_source", `Primary source ${primary.db}:${primary.uid} is already covered by an existing artifact.`);

  // Upsert sources (idempotent on the dedup key) and collect their ids.
  const sourceIds: { id: string; role: "primary" | "supporting"; citation_text?: string }[] = [];
  for (const s of sources) {
    const { data: row, error } = await db
      .from("sources")
      .upsert(
        {
          source_db: s.db,
          source_uid: s.uid,
          url: s.url ?? null,
          title: s.title ?? null,
          raw_meta: (s.raw_meta ?? null) as never,
        },
        { onConflict: "source_db,source_uid" },
      )
      .select("id")
      .single();
    if (error || !row) return err(500, "source_write_failed", error?.message ?? "source upsert failed");
    sourceIds.push({ id: row.id, role: s.role, citation_text: s.citation_text });
  }

  const slug = await uniqueSlug(db, parsed.data.slug ?? validDoc.title);
  const { data: artifact, error: artErr } = await db
    .from("artifacts")
    .insert({
      slug,
      title: validDoc.title,
      summary: validDoc.summary,
      status: "draft",
      schema_version: version,
      doc: validDoc as never,
      last_worker: `worker:${worker.id}`,
    })
    .select("id, slug, status")
    .single();
  if (artErr || !artifact) return err(500, "artifact_write_failed", artErr?.message ?? "artifact insert failed");

  const { error: linkErr } = await db.from("artifact_sources").insert(
    sourceIds.map((s) => ({
      artifact_id: artifact.id,
      source_id: s.id,
      role: s.role,
      citation_text: s.citation_text ?? null,
    })),
  );
  if (linkErr) return err(500, "provenance_write_failed", linkErr.message);

  await snapshotRevision(
    db,
    { id: artifact.id, schema_version: version, doc: validDoc, title: validDoc.title, summary: validDoc.summary },
    `worker:${worker.id}`,
    "initial draft",
  );
  await audit(db, `worker:${worker.id}`, "create_draft", artifact.id, { slug });

  return json({ id: artifact.id, slug: artifact.slug, status: artifact.status }, 201);
}
