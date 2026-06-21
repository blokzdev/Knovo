# Agent Architecture

The autonomous author is a **scheduled Claude routine** (the web-app feature), not code on
Vercel. It runs daily, drafts one source-grounded artifact, and stops. The canonical,
paste-ready routine instructions live in `docs/routines.md`.

## Pipeline
```
1. DISCOVER   Find a candidate new finding in the niche from bioRxiv, PubMed, ChEMBL,
              and PDB (PDB via its public REST API — no MCP connector exists for it).
2. GROUND     Pull the primary source(s); capture stable identifiers (PDB ID, ChEMBL ID,
              PMID, DOI), canonical URLs, titles, retrieval time, raw metadata.
3. DEDUP      Query seen_source_keys and rejected_source_keys. If the primary source was
              already seen or previously rejected → STOP (do not draft).
4. COMPOSE    Fill the artifact slot schema (stage / panel[] / controls[] / caption[]).
              Fill slots ONLY — never emit layout, never escape the schema vocabulary.
5. VALIDATE   Parse the document with the versioned zod artifact schema. If it fails →
              STOP; do not insert. Malformed output never reaches the review queue.
6. PERSIST    Insert sources (idempotent on UNIQUE(source_db,source_uid)), insert the
              artifact as status='draft', insert artifact_sources with citations.
              Insert-only; never publish, update, or delete.
```

## Invariants the routine must honor
- **Drafts only.** No publish/update/delete. Enforced at the database (RLS + least-privilege
  credential), because attached connectors run writes without per-action prompts — the
  guarantee cannot live in the prompt alone (see `security-and-privacy.md`).
- **Source-grounded.** Every artifact has ≥1 `primary` source with a stable identifier and
  a citation the admin can verify. No source → no draft.
- **Schema-bound.** Output is a slot document conforming to the current `schema_version`,
  validated by zod before storage. No layout code, no new vocabulary.
- **Deduplicated.** Never re-draft an already-seen or rejected finding.
- **One finding per run** (v1). Keeps review throughput predictable.

## Why zod-before-storage matters
The review queue is the admin's trust surface. If malformed or schema-escaping output could
land there, the admin would be reviewing garbage and the renderer could break. Validating
against the versioned zod schema **before** insert means: every row in the queue renders,
every row conforms to the vocabulary, and the admin only ever spends attention on real
candidates. Validation failure is a routine-side stop, not a draft.

## Connectors (per the routine UI)
- **Keep:** bioRxiv, ChEMBL, PubMed (discovery/grounding), tldraw (diagram stages),
  Supabase (persist).
- **Remove:** Clinical Trials, CMS Coverage, ICD-10 Codes, LunarCrush, NPI Registry —
  out of niche, and attached connectors can be used for writes without prompting, so we
  attach only what the routine needs.
- **PDB:** no connector; reached via public RCSB/PDB REST API. (Open question / backlog.)

## Change protocol
Whenever the schema, connectors, or this generation flow change: regenerate
`docs/routines.md` **and** emit a paste-ready block so the operator can update the routine
in the web app (this rule is enforced by `CLAUDE.md`).

## Open questions
- Discovery ranking: how the routine chooses *which* new finding when several qualify.
  Trigger: drafts skew toward low-value findings.
- Should validation failures be logged somewhere the admin can see (vs. silent stop)?
  Trigger: first suspicion that good findings are being silently dropped.
