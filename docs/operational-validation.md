# Operational validation — running the governed loop locally

Phase 1 is code-complete. This runbook is how we **prove the governed loop actually runs** —
draft → review → publish → public read → reader engagement — end-to-end against a real database,
entirely on a local machine with **no production secrets**. It is the repeatable Phase-1 gate.

The Claude routine workers (Scout / Editor / Keeper) are just HTTP clients that present a per-worker
bearer token to the governed API. So we can validate the whole spine without the Claude web app: the
committed integration suite drives the **real worker route handlers** against a **local Supabase**
stack, and mirrors the admin half exactly as `lib/admin/actions.ts` does.

## What this validates
- Worker bearer-token auth + **verb scoping** (incl. Keeper, previously unauthenticated).
- **zod** slot-schema validation at the write boundary (422 on escape).
- **Dedup**: a seen primary source (409) and a previously-rejected one (409) are not re-drafted.
- The **human publish gate**: a worker cannot publish without admin `approved` **or** an open
  `publish_after` directive; both authorized paths succeed.
- **Edit-live** gate: editing a published artifact needs an open edit directive.
- **Keeper** sweep (`review-targets`) + drift `flag`, and that flagged items leave the sweep.
- **Public RLS read**: only `published`, non-deleted artifacts are visible to anon; soft-delete hides
  and is recoverable.
- **Audit log** + **revision** snapshots accrue on every mutation.

## Prerequisites
- **Docker Desktop running** (the Supabase CLI runs Postgres + Auth + PostgREST in containers).
- Node 20+ and repo deps installed (`npm install`).

## 1 — Start the local Supabase stack
```bash
npx supabase start         # first run pulls images (a few minutes); applies supabase/migrations/*
npx supabase status        # shows API URL, anon key, service_role key
```
`supabase start` applies migrations `0001`–`0008` to a fresh local Postgres (it provides the
`auth` schema + `pgcrypto` the migrations depend on). To re-apply from scratch later:
`npx supabase db reset`.

## 2 — Create `.env.local` (git-ignored)
Copy from `.env.example` and fill the **local** values from `supabase status` plus three generated
worker tokens (`openssl rand -hex 32`). No production values are involved.

| `.env.local` var | value from `supabase status` |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **API URL** (`http://127.0.0.1:54321`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **anon key** |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role key** |
| `KNOVO_WORKER_TOKEN_SCOUT` / `_EDITOR` / `_KEEPER` | three `openssl rand -hex 32` values |

The local anon/service_role keys are non-secret demo keys (same for every local stack); they never
leave the machine.

## 3 — Run the integration suite (the proof)
```bash
npm run test:integration
```
Drives the full loop against the local stack (`test/integration/loop.test.ts`). Green = the governed
loop runs end-to-end. It seeds its own throwaway admin/viewer users and uses per-run synthetic source
IDs, so it is safe to re-run.

## 4 — Visual verification (optional but recommended)
```bash
npm run dev:admin          # creates admin@knovo.local (role=admin) + writes .dev-admin-cookies.json
npm run seed:demo          # publishes 3 real, cited demo artifacts (molecular3d / chart / diagram)
npm run dev                # http://localhost:3000
```
- Public renders: `/a/demo-spike-rbd-ace2-interface` (3D), `/a/demo-imatinib-kinase-selectivity`
  (chart), `/a/demo-imatinib-bcr-abl-mechanism` (diagram) — and the expand-to-immersive control.
  (The 3D viewer fetches its PDB structure from RCSB at runtime, so it needs internet.)
- Admin HUD: inject the cookies from `.dev-admin-cookies.json` into the browser for
  `http://localhost:3000`, then open `/admin` (queue), `/admin/a/<id>` (review surface).

## 5 — Teardown
```bash
npx supabase stop          # stops containers (data persists); `--no-backup` to discard volumes
```

## What "green" looks like
- `npm run test:integration` — all loop cases pass.
- The three demo artifacts render at their clean URLs (light + dark), with the auto provenance footer.
- The admin HUD shows the queue and the per-artifact review surface (preview, directives, revisions,
  audit).

> CI note: this suite is **not** part of `npm test` / the manual CI workflow (which run DB-free with
> placeholder env). It requires a running local Supabase and is run on demand, per this runbook.
