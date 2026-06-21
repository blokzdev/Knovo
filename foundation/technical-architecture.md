# Technical Architecture

## Stack (locked)
- **Web app:** Next.js (TypeScript, App Router) + Tailwind + shadcn/ui.
- **Backend:** Supabase — Postgres, Auth (Google OAuth), Row-Level Security.
- **Hosting:** Vercel. Responsive, PWA-capable. No native/desktop wrappers.
- **Autonomous authoring:** runs in **Claude** (the web-app scheduling feature), **not on
  Vercel**. The routine writes to Supabase directly.

## Component map
```
            ┌─────────────────────────────┐
            │  Claude scheduled routine    │   (NOT Vercel)
            │  discover → ground → dedup → │
            │  build slots → zod-validate  │
            │  → INSERT draft              │
            └──────────────┬──────────────┘
                           │ insert-only (least-privilege cred)
                           ▼
        ┌──────────────────────────────────────┐
        │ Supabase: Postgres + Auth + RLS       │
        │ artifacts / sources / artifact_sources│
        │ profiles (role)                        │
        └───────┬───────────────────────┬───────┘
                │ admin (server-side)    │ public read (published only)
                ▼                        ▼
   ┌─────────────────────┐   ┌──────────────────────────┐
   │ Next.js on Vercel   │   │ Next.js on Vercel        │
   │ admin review UI +   │   │ public read site (SSR,   │
   │ short server actions│   │ clean URLs, JSON-LD)     │
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

## Where work runs (and why timeouts are a non-issue)
- **Heavy/long work (discovery, source pulls, artifact authoring)** runs in the Claude
  routine, off Vercel.
- **Vercel only** serves pages (SSR/ISR reads) and **short admin/server actions** (promote,
  reject) — all well under serverless function timeout limits. We never run minutes-long
  jobs in a Vercel function. See `deployment.md`.

## Data flow summary
1. Routine inserts a schema-valid **draft** + its sources (insert-only credential).
2. Admin reads drafts via authenticated Next.js pages; verifies sources; promotes/rejects
   via a short server action that updates status (admin privilege only).
3. Public Next.js pages SSR **published** artifacts (RLS guarantees only published rows are
   visible to anon).

## Validation boundary
Artifact documents are validated with **zod against the versioned artifact schema before
storage** (in the routine) and again defensively on read in the renderer. Malformed output
never reaches the review queue or the renderer (`agent-architecture.md`).

## Open questions
- SSR vs ISR vs static export per artifact: start with SSR/ISR; revisit when traffic or
  build-time data shows a clear winner. Trigger: measurable TTFB or build-time pain.
- Whether to cache three.js structure fetches (PDB) at the edge. Trigger: PDB fetch latency
  degrades first paint.
