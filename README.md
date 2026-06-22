# Knovo

AI-authored library of interactive, source-grounded explainers in structural/molecular
biology, molecular pharmacology, and de novo protein & drug design. Claude drafts artifacts
autonomously on a schedule; a human admin reviews and publishes.

## Docs
Start with [`CLAUDE.md`](./CLAUDE.md) (memory harness), then [`DECISIONS.md`](./DECISIONS.md),
[`BACKLOG.md`](./BACKLOG.md), and [`foundation/`](./foundation). The core domain spec is
[`foundation/artifact-schema.md`](./foundation/artifact-schema.md).

## Stack
Next.js (TypeScript, App Router) · Tailwind · Supabase (Postgres/Auth/RLS) · Vercel.
The autonomous routines run in Claude (not Vercel) — see [`docs/routines.md`](./docs/routines.md).

## Run it
See [`SETUP.md`](./SETUP.md). In short:
```bash
cp .env.example .env.local   # fill in the dev Supabase project values
npm install
npm run dev                  # http://localhost:3000
```

## Layout
- `app/` — public read site (`/`, `/a/[slug]`) + admin queue (`/admin`) + OAuth callback
- `lib/` — Supabase clients, generated DB types, the zod artifact schema
- `supabase/migrations/` — schema, RLS, dedup views, least-privilege routine role
- `foundation/`, `docs/` — the spec
