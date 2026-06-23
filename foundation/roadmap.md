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

## Phase 1 — Governed editorial team, review, read
*(Reshaped 2026-06-22 around the governed-autonomy pivot.)*

**1a — Governed pipeline foundation (this milestone):** the governed Knovo API
(`api.knovo.ai`) as the sole worker write path; schema `0004` (lifecycle, comments/directives,
revisions, series, audit, soft-delete); the **Scout + Editor + Keeper** worker specs
(`docs/routines.md`).

**1b — Admin dashboard HUD + faithful renderer v1 (DONE 2026-06-22):**
- The **control HUD** (`/admin`): status queue + counts, the action queue + open flags, worker
  dispatch (run-now), library, and the artifact review surface — inline preview, directive
  composer (action × publish_after + note), status controls (approve/publish/reject/archive/
  soft-delete), revisions + audit tabs, "send to Editor now". Audited admin server actions.
- **Shared `<ArtifactRenderer>` v1:** real charts (recharts) + real 3D molecular viewer
  (3Dmol.js) + panels/captions + auto provenance footer; basic controls. shadcn/ui design system.

**1b-follow — renderer hardening (in progress):** close the gap between the slot schema (ahead)
and the renderer. Plan of record + the v1 param/selection grammars: `docs/renderer-hardening.md`.
One branch/PR each, owner merges between:
- **PR0 (done):** migration `0007` (clear security advisors 0028/0029 on the reader-comment stamp
  trigger fn) + capture this plan into the docs.
- **PR1:** interactive control→stage param-grammar (lift control state, controlled `ControlsBar`)
  **+** molecular3d highlight **selection grammar** → 3D (colored overlays, per-highlight toggle,
  spin) and chart `axes.y.log`. Adds a vitest test runner; regenerates `docs/routines.md`.
- **PR2:** tldraw `diagram` rendering (read-only snapshot, lazy/client-only).
- **PR3:** immersive responsive mode (fullscreen stage / drawer panels / overlay controls).

> **Sequence note (2026-06-23):** the work order is: **admin BYOK settings** (done, `0008` —
> `/admin/settings` stores routine fire URLs + tokens + `KNOVO_API_BASE`) → **design-system & layout
> elevation** (done, #13 — see below) → **PR4: design follow-on surfaces** (in progress — legal/MDX
> dark-mode redesign, branded global states (404/error/loading), auth/account polish) → **PR5: tldraw
> `diagram`** → **PR6: immersive mode**. (Transactional email is split into its own feature PR — it
> needs an email provider + secret + send path, not just design.)
>
> **Design-system elevation (DONE 2026-06-23):** one brand-aware token system + **light/dark toggle**
> (`next-themes`) across the **admin HUD + public site**; a responsive app shell (mobile nav drawer
> that fixes the wrapping header); `next/font` typography (Inter + JetBrains Mono); dark-mode-safe
> renderer (3Dmol/recharts read theme colors); shared primitives (`components/common/*`) for DRY.
> Canonical reference: `docs/design-system.md`. Remaining follow-on (PR4 + the email PR): the deferred
> surfaces in the Phase 3 bullet below.

**1c — Public read site (DONE 2026-06-22):** SSR live-published artifacts at clean URLs
(`/a/<slug>`) via the shared `<ArtifactRenderer>`, with generateMetadata + JSON-LD
(`ScholarlyArticle`); `/explore` browse, `/series/<slug>` pages, an RSS feed (`/feed.xml`),
sitemap + robots, and a shared public shell (`app/(site)/` header/footer). Public reads exclude
non-published/soft-deleted.

**1d — Reader accounts & engagement (DONE 2026-06-22):** Google sign-in for readers; bookmarks;
reader comments (distinct from editorial directives) with admin moderation; subscribe (record +
RSS now, email later). Amended Decision #5. Schema `0005`; `0006` hardened it (author display
denormalized onto the comment row → no SECURITY DEFINER view; RLS `(select auth.uid())`; FK
indexes — clean Supabase security advisors).

**Phase 1 status:** code-complete (author → review → publish → public read → reader engagement).
Remaining to *run* the loop end-to-end is operational: worker tokens in Vercel + a first
worker-authored, admin-published artifact. The routine **fire URLs + tokens** can now be set by the
admin in `/admin/settings` (`0008`, BYOK) instead of redeploying env vars. Next dev work is
**1b-follow** (renderer hardening), now preceded by the design-system elevation PR.

**Phase 1 gate (sketch):** a worker drafts a real finding via the API; the admin reviews,
comments/directs in the HUD, and the Editor iterates and publishes on direction; the published
artifact renders responsively at a clean URL and is indexable.

## Phase 2 — Validate & harden (sketch)
- Cadence/volume tuning; discovery ranking.
- Observability for the routine (validation drops, dedup hits).
- Audience signal (are niche practitioners returning?).

## Phase 3 — Site experience & public presence (sketch)
A focused design pass on everything *around* the artifacts, once the content engine is
proven. Distinct from the single artifact renderer (Phase 1) — this is the surrounding app.
- **Rich, interactive marketing/legal pages:** a real landing/home, an `/about`, and elevated
  `/legal/*` pages (the Phase 0 versions are intentionally minimal). Built on the MDX
  foundation laid in Phase 0.
- **Design system & brand:** the token system + light/dark + shared primitives + typography shipped
  in the **design-system elevation** (2026-06-23, admin + public; `docs/design-system.md`). **PR4**
  extends it to the **legal/MDX prose** (dark-mode redesign), **branded global states** (404/error/
  loading + reader skeleton), and **auth/account** polish. Still open: **transactional-email
  templates** (its own feature PR — needs an email provider + secret) and, later, a richer landing /
  `/about`.
- **App subsections:** navigation, browse/filter by niche, an explainer index/gallery.
- **SEO & PWA:** OpenGraph/Twitter cards, sitemap, robots, JSON-LD coverage, web manifest and
  installable PWA — the polish intentionally deferred from the Phase 0 "unblock verification"
  branding pass.

**Phase 3 gate (sketch):** a coherent branded experience — landing, about, browse, and legal —
that a first-time niche visitor can navigate, with SEO/social/PWA metadata complete.

## Later (deferred — see BACKLOG.md)
Public accounts, bookmarks, comments; 3D poster/thumbnail generation; PDF export to Google
Drive; social preview cards; any monetization (requires Vercel Pro). None are built until
explicitly pulled from the backlog.

## Open questions
- Phase 1 ordering: renderer-first vs. pipeline-first. Trigger: starting Phase 1.
- What audience signal counts as "validated" before considering monetization. Trigger:
  first sustained traffic.
