# DECISIONS

The locked decisions for Knovo. **Frozen** — do not re-litigate. To change one, write the
proposal to `BACKLOG.md` and ask (per `CLAUDE.md`).

| # | Decision | Rationale | Status |
|---|---|---|---|
| 1 | **Narrow niche only:** structural/molecular biology, molecular pharmacology, de novo protein & drug design. NOT broad biomedical, NOT patient-facing/consumer health. | Defensible wedge; trustworthy autonomous authoring needs a bounded domain. | Locked |
| 2 | **Human-in-the-loop publish gate is the spine.** Routines write **drafts only**; the admin promotes a draft to published or rejects it; nothing auto-publishes; rejected findings are not re-drafted. | Autonomous authoring is only acceptable with a human gate. | Locked |
| 3 | **Every artifact is source-grounded.** Pulled from PDB, ChEMBL, PubMed, bioRxiv, with stored provenance (incl. a stable source identifier) and verifiable citations. Drafts are deduplicated against already-seen and rejected sources. | Source-grounding + dedup is why AI authoring is trustworthy here. | Locked |
| 4 | **Auth:** Supabase Auth + Google OAuth; role-based with an `admin` role; RLS enforced. The routine uses a least-privilege path — insert-only on drafts; no update/delete/publish; no destructive permissions. | Bound the autonomous writer's blast radius at the database. | Locked |
| 5 | **Public is read-only at launch.** Build the schema to accommodate public accounts, bookmarks, and comments LATER (profiles + role present now), but do NOT build accounts or comments now. | Validate audience before building social features. | Locked |
| 6 | **Stack:** web-first — Next.js (TS, App Router) + Tailwind + shadcn/ui + Supabase (Postgres/Auth/RLS) on Vercel; responsive, PWA-capable; **no** native/desktop wrappers. Routines run in **Claude** (not Vercel) and write to Supabase directly, so Vercel only serves pages + short actions, well under function timeouts. | Minimal infra; discovery-friendly web; off-platform heavy work. | Locked |
| 7 | **No monetization/payments at MVP.** Validate audience first. | Don't build commerce before demand. | Locked |
| 8 | **Public repo; zero secrets committed.** All keys in env and connector auth. | Public code, private secrets. | Locked |
| 9 | **Artifacts are versioned slot-schema documents** (starter vocab: stage / panel / controls / caption + auto provenance footer), stored as JSONB, rendered by ONE responsive renderer that owns all layout (portrait/landscape/immersive). The routine fills slots — never emits layout, never escapes the schema. v1 vocabulary is minimal and grows only by reviewed schema change + version bump; older artifacts keep rendering after a bump. | Safe authoring, consistent rendering, controlled evolution. | Locked |
