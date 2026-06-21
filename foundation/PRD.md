# Product Requirements (MVP)

## Goal
Stand up a library where Claude autonomously drafts source-grounded interactive artifacts
about new findings in the niche, an admin reviews and publishes them, and the public reads
the published ones. Validate audience before building anything beyond that.

## Personas
- **Admin (human-in-the-loop).** The single privileged user at MVP (Google OAuth, `admin`
  role). Reviews drafts, verifies sources, promotes to published or rejects.
- **Autonomous routine (Claude).** Runs on a schedule in the Claude web app. Inserts
  **drafts only** to Supabase. No update/delete/publish.
- **Public reader.** Unauthenticated. Reads published artifacts only. No account at MVP.

## MVP scope (in)
1. **Artifact data model** — versioned slot-schema documents stored as JSONB
   (see `artifact-schema.md`).
2. **Status lifecycle** — `draft → published | rejected`; rejected is terminal.
3. **Provenance & citations** — every artifact links to stored sources with stable
   identifiers the admin can verify (see `content-integrity.md`, `data-model.md`).
4. **Dedup** — a draft is suppressed if its primary source was already seen or previously
   rejected.
5. **Admin review surface** — list drafts, inspect the rendered artifact + sources,
   promote or reject (Phase 1).
6. **Public read site** — server-rendered published artifacts with clean URLs and
   structured data (Phase 1).
7. **One responsive renderer** — owns all layout (portrait/landscape/immersive); the
   routine fills slots and never emits layout.
8. **Auth & RLS** — Supabase Auth + Google OAuth; row-level security; least-privilege
   insert-only path for the routine.

## MVP scope (out — logged in BACKLOG.md)
- Public accounts, bookmarks, comments. (Schema accommodates them later: profiles + role
  exist now; the feature does not.)
- 3D poster/thumbnail generation, PDF export to Google Drive, social preview cards.
- Monetization / payments.
- Native/desktop wrappers.
- Any source beyond PDB/ChEMBL/PubMed/bioRxiv.

## User stories
- *As the admin,* I sign in with Google and see a queue of drafts.
- *As the admin,* I open a draft, see it rendered, and see each source with a verifiable
  identifier and citation before deciding.
- *As the admin,* I promote a draft to published or reject it with a reason; rejected
  findings never come back.
- *As the routine,* I discover a new finding, ground it in primary sources, dedup it,
  build a schema-valid artifact, and insert it as a draft — nothing more.
- *As a public reader,* I open a published artifact at a clean URL and interact with it on
  phone or desktop.

## Non-functional requirements
- **Discoverability:** published pages server-rendered, indexable, with JSON-LD.
- **Integrity:** no artifact reaches the review queue unless it passes zod validation
  against the artifact schema; no artifact goes live without admin action.
- **Security:** public repo with zero committed secrets; service-role key server-only;
  routine cannot publish, update, or delete.
- **Cost/timeouts:** Vercel only serves pages and short admin/server actions; heavy
  authoring runs in Claude, not on Vercel — so functions stay well under timeout limits.

## Phase 0 gate (definition of done for foundation)
App runs locally; schema applied with RLS; admin logs in via Google; draft/published/
rejected lifecycle modeled with the routine role insert-only on drafts; `.env.example`
committed and complete; CI green on a no-op commit; DECISIONS.md, BACKLOG.md, and
docs/routines.md present. (Phase 1 does not start until this is verified and approved.)

## Open questions
- Admin count stays at one for MVP. Trigger to revisit: a second trusted reviewer is needed.
- Review SLA / staleness handling for drafts not actioned. Trigger: drafts pile up.
