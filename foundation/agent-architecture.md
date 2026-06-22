# Agent Architecture

*(Amended 2026-06-22 — governed autonomous editorial team.)*

Knovo's authors are **Claude routine workers** (the web-app routines feature), not code on
Vercel. They run on schedules and on-demand (dashboard-fired API triggers), and they reach
Knovo data **only through the governed Knovo API** (`api.knovo.ai`) — never the database
directly. The admin dashboard is a **control HUD**: the human directs work with status markers
and natural-language comments; workers read those directives and act. Canonical, paste-ready
worker instructions live in `docs/routines.md`.

## The workers (start with two; grow as needed)
- **Scout** — discovery/draft. Trawls the niche (bioRxiv, PubMed, ChEMBL, PDB-via-REST), grounds
  a finding in primary sources, and creates a **draft** via the API. Lowest trust (reads
  untrusted external text) → smallest verb set (`dedup`, `create`).
- **Editor** — iterate/enhance/publish. Reads its **queue** (open admin directives/comments)
  and acts: revises drafts in place, restructures into series, enhances live articles,
  transitions status, and **publishes when the admin has directed it** (`approved` or an
  `iterate_and_publish` directive). Larger verb set; acts on admin-reviewed intent.

## Pipeline (Scout)
```
1. DISCOVER  one candidate finding in the niche (bioRxiv, PubMed, ChEMBL, PDB via RCSB REST).
2. GROUND    capture primary source(s): stable id, URL, title, retrieval time, raw meta, citation.
3. DEDUP     POST /worker/dedup — if the primary source is seen or rejected → STOP.
4. COMPOSE   fill the slot schema (stage / panel[] / controls[] / caption[]). Slots only.
5. PERSIST   POST /worker/artifacts — the API zod-validates, stores provenance, snapshots an
             initial revision, audits, and returns the draft. (Validation failure → 422, no row.)
```

## Loop (Editor — the collaborative HUD reaction)
```
1. PULL      GET /worker/queue — open directives/comments paired with their artifact.
2. ACT per directive:
   - iterate_and_resubmit / revise → PATCH the doc, set status needs_review
   - iterate_and_publish          → PATCH the doc, then POST status=published (gate satisfied)
   - enhance (live article)       → PATCH the doc in place (directive authorizes editing live)
   - make_series                  → POST /worker/series, attach artifacts
   - archive                      → POST status=archived
3. RESOLVE   POST /worker/comments/:id/resolve — mark the directive handled (leaves the queue).
```
Every content write snapshots the prior version to `revisions`; every mutation is audit-logged.

## Invariants the workers must honor
- **Governed writes only.** All data access is via the Knovo API with the worker's bearer
  token. No Supabase connector, no service-role key, no direct DB. (`security-and-privacy.md`)
- **Human-directed publish.** A worker can publish only when the artifact is admin-`approved`
  or carries an open `iterate_and_publish` directive. Nothing reaches the public otherwise.
- **Source-grounded.** Every artifact has ≥1 `primary` source with a stable id + citation.
- **Schema-bound.** Output is a slot document conforming to the current `schema_version`; the
  API zod-validates before storage. No layout code, no new vocabulary.
- **Deduplicated.** Never re-draft an already-seen or rejected finding.

## Why the API boundary matters
Routine sessions ingest untrusted external text and run connectors without per-action prompts,
so the safety guarantees cannot live in the prompt. Putting validation, transition rules,
audit, and soft-delete in the **Knovo API** (trusted JS) means even a compromised or
prompt-injected worker can only perform governed, recoverable, audited content actions — and
only the zod-conformant ones reach the review queue or the public site.

## Connectors (per worker, per the routine UI)
- **Scout — keep:** bioRxiv, ChEMBL, PubMed (PDF Viewer optional). PDB via public RCSB REST.
- **Editor — keep:** bioRxiv, ChEMBL, PubMed, tldraw (diagram stages).
- **Both — remove everything else**, incl. **Supabase** (workers use the API, not the
  connector), Three.js Viewer, Vercel, Wolfram, Booking.com, Clinical Trials, CMS Coverage,
  Excalidraw, Hugging Face, ICD-10, Malwarebytes, NPI Registry.
- Each worker's env allowlists only `api.knovo.ai` + `data.rcsb.org`/`files.rcsb.org` and holds
  its `KNOVO_WORKER_TOKEN_*`.

## Change protocol
Whenever the schema, connectors, or this flow change: regenerate `docs/routines.md` **and**
emit paste-ready blocks so the operator can update the routines (rule enforced by `CLAUDE.md`).

## Open questions
- Discovery ranking: how Scout chooses which finding when several qualify. Trigger: drafts skew
  to low-value findings.
- Whether a fully-autonomous (non-directed) publish worker is ever wanted. Trigger: the admin
  trusts the pipeline enough to drop the per-item publish directive. (Logged in BACKLOG.)
- Surfacing API validation failures to the admin vs. silent worker stop. Trigger: suspicion
  good findings are being dropped at the boundary.
