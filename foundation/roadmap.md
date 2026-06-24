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

**Phase 1 status:** code-complete (author → review → publish → public read → reader engagement);
renderer hardening, design-system elevation, and PR4 design follow-ons all shipped. The governed
loop is now **operationally validated locally** (2026-06-23): a committed integration suite drives
the real worker handlers through draft → dedup → publish-gate → public read → Keeper sweep → soft-
delete against a local Supabase stack, and the three demo artifacts + admin HUD were screenshot-
verified (light + dark). See `docs/operational-validation.md`. The first real run fixed five
blocking bugs (Keeper auth; `service_role` core grants `0009`; CRLF gate; `/apple-icon` build;
SiteHeader hydration) — the value of running the loop.

**Phase 1 gate — MET IN PRODUCTION (2026-06-24).** The full governed loop ran end-to-end on the
hosted `knovo-prod` tenant with all three real Claude routines: **Scout** discovered + drafted a real
finding via the API; the admin **directed** (`directive:revise`) in the HUD; the **Editor** iterated
(7 updates) and **published on direction** — the first live artifact, *"De novo miniprotein dCX001
antagonizes CXCR4 — a computationally designed GPCR blocker"*, renders at its clean URL
(`/a/…`, HTTP 200) with `ScholarlyArticle` JSON-LD + OpenGraph (indexable); and **Keeper** swept the
published sources (two clean sweeps, **0 flags**). The human-directed publish gate held throughout.

**Phase 1 gate (criteria):** a worker drafts a real finding via the API; the admin reviews,
comments/directs in the HUD, and the Editor iterates and publishes on direction; the published
artifact renders responsively at a clean URL and is indexable. ✅ All met in prod.

## Phase 2 — Validate & harden (in progress)
- **Observability (DONE 2026-06-24):** the admin **Insights** view (`/admin/insights`) — pipeline
  flow, per-day throughput, median draft→publish, run health (with Claude session links), and the
  **drops** the governed API previously suppressed silently. The worker create path now logs
  `dedup_suppressed` (409 duplicate/rejected source) + `validation_rejected` (422 zod) as
  audit-only rows (no mutation, no gate/scope change, no migration), so "validation drops, dedup
  hits" are finally countable. Pure aggregation in `lib/admin/insights.ts` (unit-tested).
- **Cadence (active next step):** flip the loop from hand-dispatched to autonomous — add **Schedule
  triggers** to the worker routines (Scout daily @ ~1 draft/run per `vision.md`; Editor daily to clear
  the directive queue; Keeper weekly). The first prod cycle was manual; validation = the loop running
  on its own and accumulating a body of published explainers. Volume/ranking tuned from Insights data.
- Discovery ranking — which finding Scout picks when several qualify (`agent-architecture.md`). Still open.
- **Audience signal** — are niche practitioners finding + returning to the explainers? Still open;
  needs a body of content + lightweight analytics first.

> **Platform-horizon gate (still held).** GemBlog / multi-tenant (M1–M6) stays parked until this Phase 2
> validation track record exists — Phase 1 working in prod is the *runway*, not the *climb*.
- Audience signal (are niche practitioners returning?). Still open.

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

## Platform horizon (vision, not scheduled — owner-directed 2026-06-23)
The north star in `vision.md`: evolve the engine into **GemBlog** (`gemblog.co`) — a domain-agnostic,
multi-tenant AI Blog-as-a-Service with Knovo as the molecular-science showcase tenant. **Recorded, not
scheduled** — these milestones are completion-driven and **not started until explicitly pulled**, and
the narrow-niche invariant (Decision 1) keeps governing the Knovo tenant until the relevant milestone
begins (the `DECISIONS.md` vision notes flag which decisions each amends). Design lives in
`foundation/worker-harness.md` (harness), `foundation/artifact-schema.md` → "Generalization"
(design kits), and `foundation/monetization.md` (freemium).

**Sequencing & dependencies (read first).** **None of M1–M6 is started** — the project is at
**Phase 1 (code-complete, operationally unrun)**, and the whole Platform horizon is vision until
explicitly pulled. (These are **not** the completed renderer-hardening **PR0–PR3** — a separate,
finished Phase 1b-follow sequence in `docs/renderer-hardening.md`; don't conflate the two
numberings.) The flat M1..M6 list hides that the milestones are **three semi-independent tracks**:
- **Coordination — M1 → M2 → M3** (harness baseline → Supervisor/read-write → parametric prompts).
  **Strictly ordered:** M3's composer needs the M1/M2 harness substrate — so **M1–M3 before M4 is
  the correct default.**
- **Generalization — M4** (universal core + domain kits). The **most independent** track — it
  touches the renderer/schema, not worker coordination, so it is **reorderable** and can run as an
  early standalone spike to prove the universal-core thesis.
- **Tenancy + money — M5 → M6** (multi-tenant data model + rebrand → freemium); sits on top of all
  the above.

A **live second-domain tenant needs M3 + M4 + M5 together** (a kit alone ≠ a tenant). **Gate
(held):** pull *none* of M1–M6 until the Knovo tenant is validated (Phase 2) — the operational
Knovo loop + validation come first.
- **M1 — Harness baseline (read-mostly).** Publish/fork the worker-harness repo; workers *read* the
  shared constitution + their subfolder; no repo writes yet.
- **M2 — Read-write coordination + Supervisor.** Per-worker subfolder writes; the 4th **Supervisor**
  routine reconciles notes into the shared layer (no content token; schedule | **github-event** |
  fire-URL triggers; rebase-before-write).
- **M3 — Parametric prompt composer.** `compose(domainTemplate, workerRoleModule, adminParams)`;
  `routine_configs.params jsonb`; per-worker knobs in `/admin/settings`; the drift test shifts to
  "default params reproduce the canonical `docs/routines.md` block."
- **M4 — Domain kit registry.** The **universal core + domain kits** model (`artifact-schema.md` →
  "Generalization"): register per-niche stage kinds + source vocabulary + voice beyond the molecular
  kit, selectable per tenant. (Kit = render/sources/schema; paired with a harness template + env.)
- **M5 — Multi-tenant data model + onboarding + GemBlog rebrand.** Begins with the brand rename and
  **repo rename-in-place → `gemblog`** + `knovo-single-tenant` snapshot (`deployment.md`); then tenant
  isolation (the `tenants` table + `tenant_id` discriminator + RLS rewrites, `data-model.md`),
  per-tenant tokens, `‹slug›.gemblog.co` subdomain routing, and self-serve setup.
- **M6 — BaaS productization (freemium).** Tiers, DB-level generation **quotas**, **custom/vanity
  domains**, billing, and support around the above (`monetization.md`; gated by Decision 7).

## Later (deferred — see BACKLOG.md)
Public accounts, bookmarks, comments; 3D poster/thumbnail generation; PDF export to Google
Drive; social preview cards; any monetization (requires Vercel Pro). None are built until
explicitly pulled from the backlog.

## Open questions
- Phase 1 ordering: renderer-first vs. pipeline-first. Trigger: starting Phase 1.
- What audience signal counts as "validated" before considering monetization. Trigger:
  first sustained traffic.
- Platform horizon: when (if ever) to pull M1–M6 from vision into a real phase, and in what
  order relative to Phase 2/3 (see "Sequencing & dependencies" above for the track structure and the
  held gate). Trigger: the Knovo tenant is validated and a second domain is wanted.
