# Roadmap

Phases are **completion-driven**, not date-driven. A phase ends when its gate is verified
and approved. We do not start the next phase early.

## Phase 0 — Foundation
**Part A (docs):** author the foundation + operational docs encoding the locked decisions.
**Part B (scaffold):** Next.js app; Supabase wired; schema applied with RLS; Google OAuth
admin login; basic CI; env vars + committed `.env.example`.

**Phase 0 gate:**
- App runs locally.
- Schema applied with RLS; routine role insert-only on drafts.
- Admin logs in via Google.
- draft/published/rejected lifecycle modeled.
- `.env.example` committed and complete.
- CI green on a no-op commit.
- DECISIONS.md seeded; BACKLOG.md seeded; docs/routines.md drafted.

> Phase 1 does not begin until this gate is verified and approved.

## Phase 1 — Generate, review, read
- **Artifact-generation pipeline:** the v1 routine producing schema-valid, source-grounded
  drafts into Supabase (per `docs/routines.md`).
- **The single responsive renderer:** three.js / tldraw / charts across portrait/landscape/
  immersive, with the auto provenance footer.
- **Admin review surface:** draft queue, rendered preview, source verification, promote/
  reject.
- **Public read site:** SSR published artifacts at clean URLs with JSON-LD.

**Phase 1 gate (sketch):** routine drafts a real finding; admin reviews and publishes it;
the published artifact renders responsively at a clean URL and is indexable.

## Phase 2 — Validate & harden (sketch)
- Cadence/volume tuning; discovery ranking.
- Observability for the routine (validation drops, dedup hits).
- Audience signal (are niche practitioners returning?).

## Later (deferred — see BACKLOG.md)
Public accounts, bookmarks, comments; 3D poster/thumbnail generation; PDF export to Google
Drive; social preview cards; any monetization (requires Vercel Pro). None are built until
explicitly pulled from the backlog.

## Open questions
- Phase 1 ordering: renderer-first vs. pipeline-first. Trigger: starting Phase 1.
- What audience signal counts as "validated" before considering monetization. Trigger:
  first sustained traffic.
