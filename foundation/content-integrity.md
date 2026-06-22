# Content Integrity

This is the doc that makes autonomous authoring acceptable. Two mechanisms are the product
spine: **source-grounding** and the **human publish gate**. Neither is optional.

## 1. Source-grounding
Every artifact is built from primary sources in the niche — **PDB, ChEMBL, PubMed,
bioRxiv** — and stores its provenance:
- a **stable source identifier** (PDB ID, ChEMBL ID, PMID, DOI) per source,
- the canonical **URL** the admin can open,
- the **title**, **retrieval time**, and a **raw metadata** snapshot for audit,
- a human-readable **citation** per source.

No source → no draft. At least one `primary` source is required. This is why an AI is
allowed to author here: nothing is invented free-hand; every artifact is a structured view
over verifiable primary data.

## 2. The publish gate (human-directed)
*(Amended 2026-06-22.)* Workers may author, iterate, and even publish content — but the
**public-publish action is admin-directed**, and the gate is enforced in the **Knovo API**,
not just the UI:
- Workers create and refine artifacts through the workflow (draft → needs_review → …).
- The admin reviews in the dashboard HUD and directs via **status markers** (`approved`,
  `changes_requested`, …) and **directive comments** — two axes: an `action`
  (`revise`/`make_series`/`archive`) and a `publish_after` toggle, plus a natural-language note.
- The API only lets a worker set `published` when the artifact is admin-`approved` **or** an
  open directive is flagged `publish_after`; editing a published article requires an open
  `revise` directive, and archiving it requires an open `archive` directive. **Nothing reaches
  the public without admin intent.**
- **Rejected findings are not re-drafted.** Deletes are **soft** (recoverable); destructive
  and infra actions are never granted to a worker (`security-and-privacy.md`).

## 3. Validation before any write
Every worker write is validated with **zod against the versioned artifact schema inside the
Knovo API, before storage**. Malformed or schema-escaping output is rejected at the boundary
(HTTP 422), never persisted. The review queue therefore contains only renderable, conformant
candidates (`agent-architecture.md`). Because validation lives in the API (JS), it cannot be
bypassed by the prompt or a misbehaving worker.

## 4. Deduplication
A draft is suppressed if its **primary source** was already seen (`seen_source_keys`) or
previously rejected (`rejected_source_keys`). This prevents duplicate artifacts and honors
"rejected findings are not re-drafted" as a data property (`data-model.md`).

## 5. The provenance footer
Every rendered artifact carries an **auto-rendered provenance footer** derived from
`artifact_sources` + `sources` — sources, identifiers, citations, retrieval dates. The
routine never hand-authors this footer; the renderer generates it from stored provenance,
so it is always present and always accurate.

## Trust chain (end to end)
```
primary source (stable id) ─► API-stored provenance + citation ─► zod-valid draft (API)
   ─► admin reviews + directs (approve, or revise + publish_after) ─► worker publishes via API
       ─► published with auto provenance footer + audit-log entry
   └─ admin rejects ─► terminal, never re-drafted
```
Every transition is recorded in `audit_log` (who/what), and prior doc versions are kept in
`revisions`, so the chain is both governed and recoverable.

## Open questions
- Minimum citation completeness to accept a draft (e.g. require DOI for preprints?).
  Trigger: an admin can't verify a source from what was stored.
- How to handle a primary source that is later retracted/updated after publish.
  Trigger: first retraction of a cited source.
