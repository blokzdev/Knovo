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

## 2. The publish gate (human-in-the-loop)
Routines write **drafts only**. The admin is the sole path to `published`:
- The admin opens a draft, sees it rendered, and sees each source with its identifier and
  citation.
- The admin **promotes** (→ published) or **rejects** (→ rejected, with a reason).
- **Nothing auto-publishes.** **Rejected findings are not re-drafted.**

The gate is enforced in the database, not just the UI: the routine credential has no
update/publish/delete privilege (`security-and-privacy.md`).

## 3. Validation before the queue
Every routine output is validated with **zod against the versioned artifact schema before
storage**. Malformed or schema-escaping output is a routine-side stop, never a draft. The
admin's review queue therefore contains only renderable, conformant candidates
(`agent-architecture.md`).

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
primary source (stable id) ─► stored provenance + citation ─► zod-valid draft
   ─► admin verifies source ─► promote ─► published with auto provenance footer
                                   └─ reject ─► terminal, never re-drafted
```

## Open questions
- Minimum citation completeness to accept a draft (e.g. require DOI for preprints?).
  Trigger: an admin can't verify a source from what was stored.
- How to handle a primary source that is later retracted/updated after publish.
  Trigger: first retraction of a cited source.
