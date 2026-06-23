# DECISIONS

The locked decisions for Knovo. **Frozen** — do not re-litigate. To change one, write the
proposal to `BACKLOG.md` and ask (per `CLAUDE.md`).

> **2026-06-22 — Governed-autonomy amendment.** With the owner's approval, Knovo pivoted from
> "routine inserts drafts only" to a **governed autonomous editorial team**: routine workers
> have full content CRUD, but **only through the governed Knovo API**, with the public-publish
> action human-directed and destructive/infra power excluded. Decisions **2, 4, and 6** were
> amended accordingly (rows below; rationale in `agent-architecture.md` and
> `security-and-privacy.md`).
>
> **2026-06-22 — Reader-accounts amendment.** With the owner's approval, **Decision 5** was
> amended: optional public reader accounts (Google sign-in) with bookmarks, moderated public
> comments, and subscribe are now in scope (schema `0005`). Reading stays open/account-free;
> reader tables sit outside the worker API and slot schema, so the worker surface is unchanged.
>
> **2026-06-23 — Routine-trigger secrets amendment.** With the owner's approval, **Decision 8**
> was amended: the dashboard "run now" routine-trigger credentials (per-routine fire URL + token,
> plus the global `KNOVO_API_BASE`) may be **admin-managed in the database** (`routine_configs` /
> `app_settings`, schema `0008`) in addition to env. This stays compatible with Decision 8's core
> ("zero secrets in the repo"): the values live in the DB, the tables are **admin-only** (RLS
> `is_admin()`), the token is read **only server-side** and **never returned to the browser**
> (masked to `••••last4`), and every change is audit-logged. Env remains a fallback; dispatch
> resolves DB-first. Encryption-at-rest for the stored token is deferred (`BACKLOG.md`).

| # | Decision | Rationale | Status |
|---|---|---|---|
| 1 | **Narrow niche only:** structural/molecular biology, molecular pharmacology, de novo protein & drug design. NOT broad biomedical, NOT patient-facing/consumer health. | Defensible wedge; trustworthy autonomous authoring needs a bounded domain. | Locked |
| 2 | **Governed autonomy with a human-directed publish gate.** *(Amended 2026-06-22.)* Routine workers have full content CRUD **only through the governed Knovo API**, which validates the slot-schema, enforces status transitions, audit-logs every change, and soft-deletes (recoverable). Workers create/iterate/publish/archive content, but **publishing (and editing/archiving live content) requires an admin directive** — intent the admin sets in the dashboard. Nothing reaches the public except via that gate. | Autonomy is safe when actions are governed, recoverable, and the public boundary stays admin-directed. | Locked (amended) |
| 3 | **Every artifact is source-grounded.** Pulled from PDB, ChEMBL, PubMed, bioRxiv, with stored provenance (incl. a stable source identifier) and verifiable citations. Drafts are deduplicated against already-seen and rejected sources. *(Dedup + grounding enforced at the Knovo API boundary.)* | Source-grounding + dedup is why AI authoring is trustworthy here. | Locked |
| 4 | **Auth & least privilege.** *(Amended 2026-06-22.)* Supabase Auth + Google OAuth; role-based `admin`; RLS enforced for browser/admin access. Workers authenticate to the **Knovo API** with **per-worker bearer tokens scoped to specific verbs**; the service-role key is used **only** server-side inside that API — never by a worker, the browser, or the management connector. No worker holds DDL/infra power; deletes are soft; every mutation is audit-logged. | Size each worker's power to its job; keep destructive/infra power and the service-role key out of the autonomous loop. | Locked (amended) |
| 5 | **Public reader accounts are in scope.** *(Amended 2026-06-22.)* Optional Google sign-in for readers, with **bookmarks, public reader comments (with admin moderation), and subscribe** (RSS + recorded intent now; transactional email later). Reading stays fully open/account-free. Reader tables (`bookmarks`, `reader_comments`, `subscriptions`) live in `0005` (`0006` hardened), OUTSIDE the worker API + slot schema. *(The admin-only editorial **comments/directives** in 0004 are internal control signals — distinct from public `reader_comments`.)* | Dogfood as reader + admin and seed engagement now that authoring is live; readers ≠ broad-biomedical scope creep. | Locked (amended) |
| 6 | **Stack:** web-first — Next.js (TS, App Router) + Tailwind + shadcn/ui + Supabase (Postgres/Auth/RLS) on Vercel; responsive, PWA-capable; **no** native/desktop wrappers. Routines run in **Claude** (not Vercel) and write **through the governed Knovo API** on Vercel (`api.knovo.ai`) — not directly to the database. Vercel serves pages + the worker API + short actions, well under function timeouts. *(Amended 2026-06-22: workers write via the API, not direct to Supabase.)* | Minimal infra; discovery-friendly web; off-platform heavy work; one trusted write boundary. | Locked (amended) |
| 7 | **No monetization/payments at MVP.** Validate audience first. | Don't build commerce before demand. | Locked |
| 8 | **Public repo; zero secrets committed.** *(Amended 2026-06-23.)* All keys in env and connector/worker auth. Additionally, admin-managed routine-trigger credentials (fire URL + token, `KNOVO_API_BASE`) may be stored in the DB (`routine_configs`/`app_settings`, `0008`) — admin-only RLS, server-only reads, masked in the UI, audited; env stays a fallback. Still zero secrets in the repo. | Public code, private secrets; operator-set runtime secrets stay out of the repo. | Locked (amended) |
| 9 | **Artifacts are versioned slot-schema documents** (starter vocab: stage / panel / controls / caption + auto provenance footer), stored as JSONB, rendered by ONE responsive renderer that owns all layout (portrait/landscape/immersive). Workers fill slots — never emit layout, never escape the schema. *(zod validation runs in the Knovo API before any write.)* v1 vocabulary is minimal and grows only by reviewed schema change + version bump; older artifacts keep rendering after a bump. | Safe authoring, consistent rendering, controlled evolution. | Locked |
