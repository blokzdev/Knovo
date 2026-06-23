/**
 * Seed (or remove) the renderer demo artifacts.
 *
 * This is an OPERATIONAL utility, not the worker path: it writes directly with the service-role
 * key (like lib/supabase/admin.ts) to publish a couple of small, source-grounded demo artifacts
 * so the shared <ArtifactRenderer> can be verified end-to-end on a deployed preview. Every demo is
 * REAL and cited (PDB / ChEMBL) — nothing fabricated reaches the public site.
 *
 * Usage (reuses the existing env vars; no new ones):
 *   NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run seed:demo
 *   NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run seed:demo -- --remove
 *
 * Idempotent: upserts on the fixed slug. `--remove` soft-deletes (sets deleted_at) so the demos
 * disappear from the public site but stay recoverable.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";
import { CURRENT_SCHEMA_VERSION, safeParseArtifactDoc } from "../lib/artifact-schema";

type DemoSource = {
  db: "pdb" | "chembl" | "pubmed" | "biorxiv";
  uid: string;
  url: string;
  title: string;
  role: "primary" | "supporting";
  citation_text: string;
};
type Demo = { slug: string; doc: unknown; sources: DemoSource[] };

// ── Demo 1: molecular3d — exercises representation, per-highlight visibility toggles, spin,
//    initialCamera.preset, and the selection grammar (chain / resi range). Fully factual. ──────
const STRUCTURE_DEMO: Demo = {
  slug: "demo-spike-rbd-ace2-interface",
  doc: {
    schemaVersion: 1,
    title: "How SARS-CoV-2 binds its human receptor: the spike RBD–ACE2 interface",
    summary:
      "The receptor-binding domain (RBD) of the SARS-CoV-2 spike protein engages human ACE2 through its receptor-binding motif — the structural basis of viral entry (PDB 6M0J).",
    stage: {
      id: "stage",
      kind: "molecular3d",
      source: { db: "pdb", uid: "6M0J" },
      representation: "cartoon",
      highlights: [
        { id: "ace2", selection: "chain A", color: "#64748b" },
        { id: "rbd", selection: "chain E", color: "#e11d48" },
        { id: "rbm", selection: "chain E and resi 438-506", color: "#0ea5e9" },
      ],
      initialCamera: { preset: "rbm" },
    },
    panels: [
      {
        id: "about",
        kind: "prose",
        content:
          "The complex captures the SARS-CoV-2 spike **receptor-binding domain (RBD)** bound to human **ACE2**. The RBD's *receptor-binding motif* (RBM) forms the contact interface that determines host-cell recognition — a focal point for neutralizing antibodies and de novo designed binders.",
      },
      {
        id: "facts",
        kind: "keyvalue",
        content: [
          { k: "Structure", v: "PDB 6M0J" },
          { k: "Method", v: "X-ray crystallography" },
          { k: "Resolution", v: "2.45 Å" },
          { k: "Chains", v: "A = ACE2, E = spike RBD" },
        ],
      },
    ],
    controls: [
      {
        id: "rep",
        label: "Representation",
        kind: "select",
        target: "stage",
        param: "representation",
        options: ["cartoon", "surface", "sticks", "spheres"],
        default: "cartoon",
      },
      { id: "show-ace2", label: "ACE2", kind: "toggle", target: "stage", param: "highlights.ace2.visible", default: true },
      { id: "show-rbd", label: "RBD", kind: "toggle", target: "stage", param: "highlights.rbd.visible", default: true },
      { id: "show-rbm", label: "RBM interface", kind: "toggle", target: "stage", param: "highlights.rbm.visible", default: true },
      { id: "spin", label: "Spin", kind: "toggle", target: "stage", param: "spin", default: false },
    ],
    captions: [
      { id: "cap-rbm", target: "stage:rbm", text: "The receptor-binding motif (RBM, residues ~438–506) of the RBD buries into ACE2." },
      { id: "cap-about", target: "about", text: "Disabling this interface is the goal of many antibodies and de novo binders." },
    ],
  },
  sources: [
    {
      db: "pdb",
      uid: "6M0J",
      url: "https://www.rcsb.org/structure/6M0J",
      title: "Crystal structure of SARS-CoV-2 spike receptor-binding domain bound with ACE2",
      role: "primary",
      citation_text:
        "Lan J, et al. Structure of the SARS-CoV-2 spike receptor-binding domain bound to the ACE2 receptor. Nature. 2020;581:215–220. PDB 6M0J.",
    },
    {
      db: "pubmed",
      uid: "32225176",
      url: "https://pubmed.ncbi.nlm.nih.gov/32225176/",
      title: "Structure of the SARS-CoV-2 spike receptor-binding domain bound to the ACE2 receptor",
      role: "supporting",
      citation_text: "Lan J, et al. Nature. 2020;581:215–220. PMID 32225176.",
    },
  ],
};

// ── Demo 2: chart — exercises the axes.y.log toggle. Ki values are real ChEMBL measurements for
//    imatinib (CHEMBL941); the ~2,000× ABL-vs-SRC gap is what makes a log axis necessary. ──────
const CHART_DEMO: Demo = {
  slug: "demo-imatinib-kinase-selectivity",
  doc: {
    schemaVersion: 1,
    title: "Why imatinib is selective: ABL vs. an off-target kinase",
    summary:
      "Imatinib binds its therapeutic target ABL (and the BCR-ABL fusion) with low-nanomolar affinity but is ~2,000× weaker against the related kinase SRC — the basis of its kinase selectivity (Ki from ChEMBL).",
    stage: {
      id: "stage",
      kind: "chart",
      chartType: "bar",
      axes: { x: "target", y: "Ki (nM)" },
      series: [
        {
          name: "Imatinib",
          data: [
            { target: "ABL1", "Ki (nM)": 13 },
            { target: "BCR-ABL", "Ki (nM)": 14 },
            { target: "SRC", "Ki (nM)": 31000 },
          ],
        },
      ],
    },
    panels: [
      {
        id: "moa",
        kind: "prose",
        content:
          "Imatinib is an ATP-competitive **tyrosine-kinase inhibitor**. It potently inhibits ABL1 and the BCR-ABL fusion (the driver of chronic myeloid leukemia) but is far weaker against the closely related kinase SRC — illustrating how one scaffold can discriminate between similar ATP pockets.",
      },
    ],
    controls: [
      { id: "logscale", label: "Log scale", kind: "toggle", target: "stage", param: "axes.y.log", default: true },
    ],
    captions: [
      { id: "cap-sel", target: "stage", text: "Lower Ki = tighter binding. A log axis is needed to show 13 nM and 31,000 nM together." },
    ],
  },
  sources: [
    {
      db: "chembl",
      uid: "CHEMBL941",
      url: "https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL941/",
      title: "Imatinib — ChEMBL bioactivity",
      role: "primary",
      citation_text:
        "Imatinib (CHEMBL941) inhibition constants (Ki): ABL1 ≈ 13 nM, BCR-ABL ≈ 14 nM, SRC ≈ 31,000 nM. EMBL-EBI ChEMBL database (v34).",
    },
  ],
};

const DEMOS: Demo[] = [STRUCTURE_DEMO, CHART_DEMO];

async function main() {
  // --print: validate each demo against the schema and emit it as JSON; no DB access. Useful as a
  // dry run (and to derive the exact rows when seeding by other means).
  if (process.argv.includes("--print")) {
    for (const demo of DEMOS) {
      const parsed = safeParseArtifactDoc(CURRENT_SCHEMA_VERSION, demo.doc);
      console.log(
        JSON.stringify({
          slug: demo.slug,
          valid: parsed.success,
          error: parsed.success
            ? null
            : typeof parsed.error === "string"
              ? parsed.error
              : parsed.error.issues,
          doc: demo.doc,
          sources: demo.sources,
        }),
      );
    }
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.");
    process.exit(1);
  }
  const remove = process.argv.includes("--remove");
  const db = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const demo of DEMOS) {
    try {
      if (remove) {
        const { error } = await db
          .from("artifacts")
          .update({ deleted_at: new Date().toISOString() })
          .eq("slug", demo.slug);
        if (error) throw new Error(error.message);
        console.log(`🗑  soft-deleted ${demo.slug}`);
        continue;
      }

      // Validate against the same zod schema the Knovo API enforces, before any write.
      const parsed = safeParseArtifactDoc(CURRENT_SCHEMA_VERSION, demo.doc);
      if (!parsed.success) {
        const msg =
          typeof parsed.error === "string"
            ? parsed.error
            : parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        throw new Error(`invalid document — ${msg}`);
      }
      const doc = parsed.data;
      const now = new Date().toISOString();

      // Upsert provenance sources (idempotent on the dedup key) and collect their ids.
      const links: { source_id: string; role: "primary" | "supporting"; citation_text: string }[] = [];
      for (const s of demo.sources) {
        const { data, error } = await db
          .from("sources")
          .upsert(
            { source_db: s.db, source_uid: s.uid, url: s.url, title: s.title, retrieved_at: now },
            { onConflict: "source_db,source_uid" },
          )
          .select("id")
          .single();
        if (error || !data) throw new Error(`source ${s.db}:${s.uid} — ${error?.message ?? "no id"}`);
        links.push({ source_id: data.id, role: s.role, citation_text: s.citation_text });
      }

      // Upsert the artifact as published (idempotent on slug), then (re)link its sources.
      const { data: art, error: artErr } = await db
        .from("artifacts")
        .upsert(
          {
            slug: demo.slug,
            title: doc.title,
            summary: doc.summary,
            status: "published",
            schema_version: CURRENT_SCHEMA_VERSION,
            doc: doc as never,
            published_at: now,
            deleted_at: null,
            last_worker: "seed:demo",
          },
          { onConflict: "slug" },
        )
        .select("id")
        .single();
      if (artErr || !art) throw new Error(artErr?.message ?? "artifact upsert failed");

      const { error: linkErr } = await db
        .from("artifact_sources")
        .upsert(
          links.map((l) => ({ artifact_id: art.id, source_id: l.source_id, role: l.role, citation_text: l.citation_text })),
          { onConflict: "artifact_id,source_id" },
        );
      if (linkErr) throw new Error(`source links — ${linkErr.message}`);

      console.log(`✓ published ${demo.slug}  →  /a/${demo.slug}`);
    } catch (e) {
      console.error(`✗ ${demo.slug}: ${(e as Error).message}`);
      process.exitCode = 1;
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
