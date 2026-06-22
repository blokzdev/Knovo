# DECISIONS

The locked decisions for Knovo. **Frozen** — do not re-litigate. To change one, write the
proposal to `BACKLOG.md` and ask (per `CLAUDE.md`).

> **2026-06-22 — Governed-autonomy amendment.** With the owner's approval, Knovo pivoted from
> "routine inserts drafts only" to a **governed autonomous editorial team**: routine workers
> have full content CRUD, but **only through the governed Knovo API**, with the public-publish
> action human-directed and destructive/infra power excluded. Decisions **2, 4, and 6** were
> amended accordingly (rows below; rationale in `agent-architecture.md` and
> `security-and-privacy.md`).

| # | Decision | Rationale | Status |
|---|---|---|---|
| 1 | **Narrow niche only:** structural/molecular biology, molecular pharmacology, de novo protein & drug design. NOT broad biomedical, NOT patient-facing/consumer health. | Defensible wedge; trustworthy autonomous authoring needs a bounded domain. | Locked |
| 2 | **Governed autonomy with a human-directed publish gate.** *(Amended 2026-06-22.)* Routine workers have full content CRUD **only through the governed Knovo API**, which validates the slot-schema, enforces status transitions, audit-logs every change, and soft-deletes (recoverable). Workers create/iterate/publish/archive content, but **publishing (and editing/archiving live content) requires an admin directive** — intent the admin sets in the dashboard. Nothing reaches the public except via that gate. | Autonomy is safe when actions are governed, recoverable, and the public boundary stays admin-directed. | Locked (amended) |
| 3 | **Every artifact is source-grounded.** Pulled from PDB, ChEMBL, PubMed, bioRxiv, with stored provenance (incl. a stable source identifier) and verifiable citations. Drafts are deduplicated against already-seen and rejected sources. *(Dedup + grounding enforced at the Knovo API boundary.)* | Source-grounding + dedup is why AI authoring is trustworthy here. | Locked |
| 4 | **Auth & least privilege.** *(Amended 2026-06-22.)* Supabase Auth + Google OAuth; role-based `admin`; RLS enforced for browser/admin access. Workers authenticate to the **Knovo API** with **per-worker bearer tokens scoped to specific verbs**; the service-role key is used **only** server-side inside that API — never by a worker, the browser, or the management connector. No worker holds DDL/infra power; deletes are soft; every mutation is audit-logged. | Size each worker's power to its job; keep destructive/infra power and the service-role key out of the autonomous loop. | Locked (amended) |
| 5 | **Public is read-only at launch.** Build the schema to accommodate public accounts, bookmarks, and comments LATER (profiles + role present now), but do NOT build them now. *(The admin-only editorial **comments/directives** added in 0004 are internal control signals — not public social comments.)* | Validate audience before building social features. | Locked |
| 6 | **Stack:** web-first — Next.js (TS, App Router) + Tailwind + shadcn/ui + Supabase (Postgres/Auth/RLS) on Vercel; responsive, PWA-capable; **no** native/desktop wrappers. Routines run in **Claude** (not Vercel) and write **through the governed Knovo API** on Vercel (`api.knovo.ai`) — not directly to the database. Vercel serves pages + the worker API + short actions, well under function timeouts. *(Amended 2026-06-22: workers write via the API, not direct to Supabase.)* | Minimal infra; discovery-friendly web; off-platform heavy work; one trusted write boundary. | Locked (amended) |
| 7 | **No monetization/payments at MVP.** Validate audience first. | Don't build commerce before demand. | Locked |
| 8 | **Public repo; zero secrets committed.** All keys in env and connector/worker auth. | Public code, private secrets. | Locked |
| 9 | **Artifacts are versioned slot-schema documents** (starter vocab: stage / panel / controls / caption + auto provenance footer), stored as JSONB, rendered by ONE responsive renderer that owns all layout (portrait/landscape/immersive). Workers fill slots — never emit layout, never escape the schema. *(zod validation runs in the Knovo API before any write.)* v1 vocabulary is minimal and grows only by reviewed schema change + version bump; older artifacts keep rendering after a bump. | Safe authoring, consistent rendering, controlled evolution. | Locked |
