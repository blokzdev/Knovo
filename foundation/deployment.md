# Deployment

## Topology
- **Vercel** hosts the Next.js app (public read site + admin UI + short server actions).
- **Supabase** provides Postgres/Auth/RLS. **Separate dev and prod Supabase projects.**
- **Autonomous routines run in Claude**, not on Vercel. They write to Supabase directly.

## Why Vercel workloads stay under function timeouts
Because all heavy/long work (discovery, source pulls, artifact authoring) happens in the
Claude routine off-platform, every Vercel workload is either:
- an **SSR/ISR page render** (read a row, render), or
- a **short admin/server action** (promote/reject = one status update).

Neither approaches serverless function timeout limits. We never run minutes-long jobs in a
Vercel function — if something ever needs to, it belongs in a routine, not on Vercel.

## Environments
| | dev | prod |
|---|---|---|
| Supabase project | dev project | prod project (separate) |
| Vercel | preview deploys | production deploy |
| Routine target | dev project (while testing) | prod project |

Keep dev and prod Supabase fully separate — separate URLs, keys, and data. Never point a
dev routine at prod or vice versa.

## Environment variables (see `.env.example`, kept in lockstep with code)
| var | scope | purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser-safe | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser-safe | anon key (RLS-bounded) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-only** | elevated server access; **never** `NEXT_PUBLIC_`, never to client |
| `GOOGLE_OAUTH_CLIENT_ID` | server | Google OAuth (admin login) |
| `GOOGLE_OAUTH_CLIENT_SECRET` | server | Google OAuth secret |

`.env.example` lists every variable with an empty value and an inline comment (what it is /
where to get it). Any newly introduced variable is added to `.env.example` in the **same
commit**, so it is always a complete, current map of what must be set in Vercel.

## Hosting tier note
Vercel's **Hobby tier is non-commercial**. MVP (no monetization) can run on Hobby. The
moment Knovo carries ads or paid features, it must move to **Pro** — flagged here so the
tier decision is explicit when monetization is revisited (logged in BACKLOG.md).

## Deploy checklist (Phase 0 gate)
- [ ] App runs locally against the dev Supabase project.
- [ ] Schema applied with RLS on the dev project.
- [ ] Admin can sign in via Google.
- [ ] Routine role is insert-only on drafts (verified).
- [ ] `.env.example` committed and complete; real `.env.local` git-ignored.
- [ ] CI green on a no-op commit.

## Open questions
- Custom domain + when to provision it. Trigger: first public launch.
- Whether prod Supabase needs PITR/backup tier beyond defaults. Trigger: real content the
  admin would hate to lose.
