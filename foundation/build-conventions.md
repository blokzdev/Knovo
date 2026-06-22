# Build Conventions

Conventions exist to keep the foundation legible and the ship moving. Keep them light.

## Language & framework
- **TypeScript** everywhere; `strict` on. No `any` in committed code without a comment.
- **Next.js App Router.** Server components by default; client components only where
  interactivity requires it (`"use client"`). The artifact renderer's interactive layers
  are client; published pages are server-rendered.
- **Tailwind + shadcn/ui** for UI. The single artifact renderer owns artifact layout; don't
  re-implement layout per page.

## Data & validation
- **zod** is the validation boundary. The artifact schema is zod-first; types are inferred
  from zod (`z.infer`), not hand-duplicated.
- Validate routine output against the versioned artifact schema **before** storage, and
  defensively on read in the renderer.
- Database access goes through typed Supabase clients; generate DB types from the schema.

## Environment variables — lockstep rule
`.env.example` is the canonical, complete map of required env vars. **Any newly introduced
environment variable is added to `.env.example` in the same commit that introduces it**,
with an empty value and an inline comment (what it is / where to obtain it). Browser-safe
vars use `NEXT_PUBLIC_`; everything else is server-only. The real `.env.local` is
git-ignored. This keeps Vercel deploy config derivable from the repo at all times.

## Secrets
Zero secrets in the repo (public repo). See `security-and-privacy.md`. The service-role key
is server-only and never `NEXT_PUBLIC_`.

## Git & CI
- Per-task commits with clear messages; CI verifies on push.
- CI runs typecheck + lint + build (and tests as they appear). Keep CI green; a red main is
  a stop-the-line event.
- Develop on the designated feature branch; open a PR for review.

## Migrations
- Schema changes are SQL migrations applied to dev first, then prod. Both Supabase projects
  stay in sync via the same migration files.
- Artifact-schema version bumps ship with a normalize-on-read migration so old artifacts
  keep rendering (`artifact-schema.md`), and trigger a `docs/routines.md` regeneration.

## Docs hygiene
- Foundation docs are working documents: concise, current, not bloated. Update the relevant
  doc in the same change that invalidates it.
- Every session maintains `BACKLOG.md`; each foundation doc's Open questions mirror into it.

## Open questions
- Test strategy depth for MVP (unit on zod schema + a smoke e2e vs. more). Trigger: first
  regression that a test would have caught.
- Linter/formatter config specifics (eslint/prettier presets). Trigger: scaffolding in
  Phase 0 Part B.
