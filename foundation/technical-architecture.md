# Technical Architecture

## Stack (locked)
- **Web app:** Next.js (TypeScript, App Router) + Tailwind + shadcn/ui.
- **Backend:** Supabase — Postgres, Auth (Google OAuth), Row-Level Security.
- **Hosting:** Vercel. Responsive, PWA-capable. No native/desktop wrappers.
- **Autonomous authoring:** runs in **Claude** routine workers (the web-app routines feature),
  **not on Vercel**. Workers write **through the governed Knovo API** (`api.knovo.ai`) — never
  to Supabase directly. *(Amended 2026-06-22.)*

## Component map
```
   ┌──────────────────────────┐   schedule + dashboard API-trigger (fire)
   │ Claude routine WORKERS    │◄──────────────────────────────────────┐
   │ Scout (draft) / Editor    │                                        │
   │ discover→ground→dedup→    │   per-worker bearer token (verb-scoped) │
   │ fill slots → call API     │───────────────┐                        │
   └──────────────────────────┘                ▼                        │
                          ┌──────────────────────────────────────┐      │
                          │ GOVERNED KNOVO API (api.knovo.ai)     │      │
                          │ Next.js route handlers (service-role) │      │
                          │ zod-validate · transition gate ·      │      │
                          │ audit_log · revisions · soft-delete   │      │
                          └──────────────────┬───────────────────┘      │
                                             ▼                           │
        ┌──────────────────────────────────────────────────────┐        │
        │ Supabase: Postgres + Auth + RLS                       │        │
        │ artifacts/sources/links · comments · revisions ·      │        │
        │ series · audit_log · profiles(role)                   │        │
        └───────┬───────────────────────┬──────────────────────┘        │
                │ admin (server-side)    │ public read (live published)  │
                ▼                        ▼                               │
   ┌─────────────────────┐   ┌──────────────────────────┐               │
   │ Next.js on Vercel   │   │ Next.js on Vercel        │  admin fires ──┘
   │ admin HUD: queue,   │   │ public read site (SSR,   │  workers from
   │ comments, directives│   │ clean URLs, JSON-LD)     │  the HUD
   └─────────────────────┘   └──────────────────────────┘
                │
                ▼
   ┌──────────────────────────────────────────┐
   │ ONE responsive renderer (owns layout)     │
   │ portrait / landscape / immersive          │
   │ three.js | tldraw | charts per slot kind  │
   └──────────────────────────────────────────┘
```

## Rendering strategy (flows from vision)
Published artifacts are **server-rendered with clean, stable URLs** (e.g.
`/a/<slug>`) and embed **structured data (JSON-LD)** so search engines and niche readers
can discover them. This is a first-class requirement, not an optimization: discovery by
practitioners and crawlers is the distribution bet (`vision.md`).

- Published artifact pages: server components, statically/incrementally rendered where
  possible, with metadata + JSON-LD (`ScholarlyArticle`/`Dataset`-style) emitted server-side.
- The interactive layers (three.js / tldraw / charts) hydrate on the client inside the
  single renderer; the **renderer owns all layout** and reads the artifact's slot document.
- Admin pages are authenticated, not indexed.

## The single renderer
One responsive renderer consumes a slot-schema document and produces the three layout
modes (portrait/landscape/immersive). The routine never emits layout or component code —
it only fills slots (`artifact-schema.md`). This keeps authoring safe (no code injection,
no schema escape) and lets us improve layout once for every artifact, old and new.

## The governed Knovo API (`api.knovo.ai`)
A thin set of Next.js route handlers (`app/api/worker/*`) is the **only** write path for
workers. `api.knovo.ai` is CNAME'd to the same Vercel project and host-routed in `middleware.ts`
to `/api/worker/*`, isolated from the public `www` site. Auth is a **per-worker bearer token**
mapped to allowed verbs (`lib/worker-auth.ts`); the handlers use a service-role client
(`lib/supabase/admin.ts`) and enforce zod validation, status-transition rules, audit logging,
and soft-delete. The dashboard fires workers on demand via the routine API trigger
(`lib/routines.ts`).

## Where work runs (and why timeouts are a non-issue)
- **Heavy/long work (discovery, source pulls, authoring/iterating)** runs in the Claude
  workers, off Vercel.
- **Vercel only** serves pages (SSR/ISR reads), the **worker API** (short request/response per
  call), and **short admin actions** — all well under serverless timeout limits. We never run
  minutes-long jobs in a Vercel function. See `deployment.md`.

## Data flow summary
1. A worker calls the **Knovo API** with its token; the API zod-validates, writes provenance,
   snapshots a revision, audits, and stores a **draft** (or iterates/transitions an existing one).
2. Admin uses the dashboard HUD to review, comment, and set directives/status; the API lets a
   worker **publish only when admin-approved or directed**.
3. Public Next.js pages SSR **live published** artifacts (RLS guarantees only
   `published AND NOT deleted` rows are visible to anon).

## Validation boundary
Artifact documents are validated with **zod against the versioned artifact schema inside the
Knovo API, before any write** (`lib/artifact-schema.ts` → `safeParseArtifactDoc`), and again
defensively on read in the renderer. Malformed output is rejected at the API boundary (422) and
never reaches storage, the review queue, or the renderer (`agent-architecture.md`).

## Open questions
- SSR vs ISR vs static export per artifact: start with SSR/ISR; revisit when traffic or
  build-time data shows a clear winner. Trigger: measurable TTFB or build-time pain.
- Whether to cache three.js structure fetches (PDB) at the edge. Trigger: PDB fetch latency
  degrades first paint.
