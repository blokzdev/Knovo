# BACKLOG

Maintained every session (per `CLAUDE.md`). Two sections: **Deferred scope** (what we
decided not to build now, with the receipt) and **Open questions** (undecided calls, each
with the trigger that forces resolution). Each foundation doc's Open-questions section
mirrors into the Open questions section here.

---

## Deferred scope (parked features / scope-wall receipts)

| Item | Why deferred | Pull trigger |
|---|---|---|
| **3D poster / thumbnail generation** | Not needed to validate audience; adds rendering/storage complexity. | Need shareable previews or gallery thumbnails for published artifacts. |
| **PDF export to Google Drive** | Out of MVP loop (draft → review → publish → read). | A user/admin needs offline or archival exports. |
| **Social preview cards** | Distribution polish, not core trust/quality. | Sharing to social drives meaningful traffic. |
| **Public accounts & comments** | ✅ Delivered (Phase 1d, 2026-06-22, `0005`): reader Google sign-in, bookmarks, moderated public comments, subscribe (RSS + recorded intent). Decision 5 amended. | — (done) |
| **Subscription / transactional email** | Subscribe records intent + RSS feed now; email is **net-new** (no provider, dep, env var, or template exists). Split out of the PR4 design pass into its own **feature PR** (provider + secret + send path ≠ design). | Pick a provider (e.g. Resend + `RESEND_API_KEY`); add `lib/email/*` + templates; wire `setSubscribed`/publish to send. |
| **Reader comments: threading & reactions** | v1 reader comments are flat; no votes/reactions; profile is read-only from Google (no self-edit). | Engagement demand + a moderation/abuse story to scale. |
| **Monetization / payments** | No payments at MVP (Decision 7); requires Vercel Pro (Hobby is non-commercial). | Audience validated and a paid/ad model is chosen. |
| **SEO / OG / PWA polish** | Phase 1c shipped sitemap, robots, RSS, JSON-LD, and OpenGraph on artifacts. Still deferred: Twitter cards, generated OG images, web manifest, installable PWA. | Phase 3 (site experience) or first public launch — see roadmap Phase 3. |
| **Rich marketing/legal/app pages** | Phase 0 `/legal/*` pages are intentionally minimal; landing/about/browse design deferred. | Phase 3 — content engine proven, ready to invest in public presence. |
| **Admin dashboard HUD** | ✅ Delivered (Phase 1b, 2026-06-22): queue, preview, directive composer, status controls, workers dispatch, revisions/audit. | — (done) |
| **Admin routine-trigger settings (BYOK)** | ✅ Delivered (2026-06-23, `0008`): `/admin/settings` stores each routine's fire-trigger URL + token (+ `KNOVO_API_BASE`) — admin-only RLS, server-only reads, masked UI, audited; env stays a fallback. Unblocks dashboard "run now" dispatch without a redeploy. Decision 8 amended. **Enhanced (2026-06-23):** per-worker **Tabs** now co-locate in-app routine setup guidance + the **copyable paste-ready prompt** (sourced from `lib/workers/routines.ts`, drift-guarded against `docs/routines.md`) with each worker's trigger card; shared "Knovo" environment setup (env + network allowlist) is a set-once preamble. **Aligned (2026-06-23)** to the real Claude **New cloud environment** modal: Name → Network access (Custom → Allowed domains) → Environment variables (`.env`, + the platform-non-secret visibility caveat) → Setup script (optional probe); repository is selected per-routine, not on the environment. | — (done) |
| **Encrypt routine trigger token at rest** | `routine_configs.token` is stored plaintext (mitigated by admin-only RLS, server-only reads, masked UI). Acceptable for a single-admin HUD. | More admins, or a secret-exposure scare → add pgcrypto/pgsodium or move to a secrets manager. |
| **Design-system & layout elevation (dedicated PR)** | ✅ Delivered (2026-06-23): brand-aware token system + **light/dark toggle** (`next-themes`) across admin + public, responsive app shell (mobile nav drawer fixes the wrapping header), `next/font` typography, dark-mode-safe renderer, and shared `components/common/*` primitives. Canonical doc: `docs/design-system.md`. | — (done) |
| **Design follow-on surfaces** | **In progress (PR4):** legal/MDX prose dark-mode redesign (the root `mdx-components.tsx` was outside PR3's migration), **branded global states** (404/error/loading + reader skeleton), and auth/account polish. Email split to its own PR (row above); a richer landing / `/about` still deferred. | PR4 (in progress); landing/about → later Phase 3. |
| **Renderer hardening** | ✅ **Complete (Phase 1b-follow)** — all four gaps closed; plan of record in `docs/renderer-hardening.md`. PR0 (migration `0007`), PR1 (control→stage param-grammar + molecular3d highlight selection→3D, spin, chart y-log; vitest), PR5/PR2 (tldraw `diagram` — read-only `TldrawImage` static SVG + lightweight pan/zoom, v5, lazy/client-only), **PR6/PR3 (immersive mode — expand-to-fullscreen in-page overlay; the live stage stays mounted, controls float, captions pin, panels/provenance reuse `Sheet`; collapsible provenance)**. | — (done) |
| **Public read site wiring** | The shared `<ArtifactRenderer>` is built but only used in the admin HUD; public `app/a/[slug]` is still a stub. | Phase 1c — wire renderer + JSON-LD + series pages. |
| **Admin manual full-doc editing** | Admin directs the Editor worker to change content; no in-dashboard slot editor. | Admin needs to hand-edit a doc without a worker. |
| **Fully-autonomous publish worker** | Current model requires an admin directive to publish. A worker that publishes without per-item direction is possible but deliberately not built. | Admin trusts the pipeline enough to drop the per-item publish gate. |
| **File attachments to worker directives** | The routine API trigger payload is text-only (no files). Admin file hand-off would go via storage + a referenced URL. | Admin needs to attach a file/image to a directive. |
| **Public series pages** | `series` table + membership exist; public series routes not built. | Public read site (Phase 1c). |
| **Worker-harness read-write coordination + Supervisor** | Designed in `foundation/worker-harness.md` (harness repo, AGENTS.md/CLAUDE.md constitution, per-worker subfolders, scoped writes, the 4th Supervisor routine, github-event triggers). **Deferred** per scope-wall — today the repo is read-only context and there are three workers with static prompts. | Roadmap "Platform horizon" M1/M2 pulled (repo writes + Supervisor wanted). |
| **Modular / parametric routine prompts** | `compose(domainTemplate, workerRoleModule, adminParams)` with `routine_configs.params jsonb` + settings knobs (`worker-harness.md` §7). Prompts are static today (drift-guarded `lib/workers/routines.ts` ↔ `docs/routines.md`). **Deferred.** | Roadmap "Platform horizon" M3 — operators need per-worker customization. |
| **Multi-tenant AI Blog-as-a-Service (north star)** | Owner-directed vision (`vision.md`): domain templates + multi-tenant data model + onboarding, Knovo as showcase tenant. **Recorded, not scheduled** (scope-wall); narrow-niche Decision 1 still governs the Knovo tenant. | Roadmap "Platform horizon" M4–M6 — Knovo validated and a second domain wanted. |

---

## Open questions (each with a resolution trigger)

### From the routine UI / connectors
- **No PDB connector exists** in the routine's connector list, yet PDB is a locked source.
  Plan: workers reach PDB via the public RCSB/PDB REST API (allowlisted host). *Trigger:*
  PDB fetching proves unreliable or a first-class connector becomes available.
- **Connectors run writes without per-action prompts.** *(Updated 2026-06-22.)* Workers no
  longer use the Supabase connector at all — they write via the governed Knovo API. Attach only
  research connectors per worker (Scout & Keeper: bioRxiv/ChEMBL/PubMed; Editor: + tldraw);
  remove the rest, incl. **Supabase**. *Trigger:* a worker needs a new data source.

### vision.md
- Primary-source set fixed at PDB/ChEMBL/PubMed/bioRxiv. *Trigger:* repeated high-value
  findings whose primary source lives elsewhere (e.g. UniProt, EMDB).
- Cadence (daily) and volume (one artifact/run). *Trigger:* admin review throughput proves
  higher or lower than one/day.

### PRD.md
- Admin count stays at one. *Trigger:* a second trusted reviewer is needed.
- Review SLA / staleness for un-actioned drafts. *Trigger:* drafts pile up.

### technical-architecture.md
- SSR vs ISR vs static per artifact (start SSR/ISR). *Trigger:* measurable TTFB or
  build-time pain.
- Edge-cache three.js structure (PDB) fetches. *Trigger:* PDB fetch latency degrades first
  paint.

### data-model.md
- **Resolved (2026-06-22):** `published` edits mutate in place **and** snapshot the prior
  version to `revisions` (recoverable) — not a new artifact row.
- Do rejected *supporting* sources block re-draft, or only *primary*? (Current: only
  primary.) *Trigger:* a re-draft slips through on a supporting match.

### agent-architecture.md
- Discovery ranking: which finding to pick when several qualify. *Trigger:* drafts skew to
  low-value findings.
- Surface validation failures to the admin vs. silent stop. *Trigger:* suspicion that good
  findings are silently dropped.

### worker-harness.md
- **Supervisor trigger default** — schedule vs github-event vs manual, and whether it ever needs a
  read-only token vs none. *Trigger:* implementing read-write coordination (M2).
- **GitHub-event concurrency** — rebase-before-write alone vs a concurrency group / debounce.
  *Trigger:* first observed double-run race.
- **Parametric composer shape** — does it *replace* the static blocks or *layer* as optional
  overrides (defaults stay static), and the `params jsonb` schema / first param set. *Trigger:*
  starting M3.
- **Public vs private baseline** — is the shipped baseline harness public (open-source exemplar) or
  a private template each tenant clones. *Trigger:* publishing the baseline repo.
- **Supervisor as a registered routine** — does it get a 4th fire-URL row in `/admin/settings` and a
  4th `routine_configs.worker` value. *Trigger:* wiring the Supervisor.

### content-integrity.md
- Minimum citation completeness to accept a draft (e.g. require DOI for preprints).
  *Trigger:* an admin can't verify a source from what was stored.
- **Partly addressed (2026-06-22):** the **Keeper** worker re-verifies published sources and
  flags retractions/updates to the admin. Open: sweep cadence/SLA, and whether a confirmed
  retraction should auto-`archive` pending admin review. *Trigger:* first retraction of a cited
  source.

### artifact-schema.md
- Allow more than one stage per artifact? (v1: one.) *Trigger:* a finding needs two
  co-equal hero surfaces.
- **Resolved (1b-follow PR1):** Control `param` grammar — v1 keeps dotted paths with a
  per-stage-kind whitelist (normative in `foundation/artifact-schema.md`; renderer in
  `lib/renderer/params.ts`).
- **Resolved (1b-follow PR1):** the molecular3d highlight `selection` grammar — v1 subset
  (`chain X`, `resi N`, `resi N-M`, `resi N,M`, `chain X and resi N-M`) specified in
  `foundation/artifact-schema.md` and implemented as `parseSelection` (`lib/renderer/selection.ts`)
  → 3Dmol atom selection; `highlights[].selection` now renders as colored 3D overlays.

### security-and-privacy.md
- **Resolved (2026-06-22):** least-privilege is the **governed Knovo API with per-worker
  verb-scoped tokens** (service-role server-only inside the API); the `knovo_routine` DB role
  was dropped in 0004.
- `audit_log` now records every API mutation. Open: whether admin **dashboard** actions need
  richer audit beyond `reviewed_by`/`reviewed_at`. *Trigger:* need to answer "which admin
  changed this and when" in detail.
- Worker-token rotation/hardening (hash-at-rest vs. env compare). *Trigger:* more workers or a
  token-exposure scare.
- **Routine trigger tokens** are now also DB-stored (`routine_configs.token`, `0008`) when set via
  `/admin/settings` — plaintext, admin-only RLS, server-only reads, masked UI, audited; env stays a
  fallback. Encryption-at-rest is deferred (same trigger as token rotation/hardening above).

### Site / branding (Phase 0 deploy)
- **Legal copy is unreviewed starter text.** `app/legal/privacy` and `app/legal/terms` were
  drafted to match Knovo's real architecture but are **not** legal advice. *Trigger:* before
  public launch / before relying on them — get a qualified human review; replace the
  `privacy@knovo.ai` / `legal@knovo.ai` contact addresses and confirm the subprocessor list.
- **Logo is an SVG wordmark/monogram, not a bespoke designed mark.** *Trigger:* a brand/design
  pass (Phase 3) if a richer identity is wanted.
- **Resolved (2026-06-23, design-system elevation):** brand **accent = indigo/violet** (from the
  KnovoMark) as the `--brand` token; **typography = Inter + JetBrains Mono** via `next/font`;
  **light/dark** shipped via `next-themes`. *Trigger to revisit:* a full rebrand, or a bespoke
  display typeface / custom palette beyond the current tokens.

### deployment.md
- Custom domain + when to provision. *Trigger:* first public launch.
- Prod Supabase PITR/backup tier beyond defaults. *Trigger:* real content the admin would
  hate to lose.

### build-conventions.md
- Test strategy depth for MVP. *Trigger:* first regression a test would have caught.
- Linter/formatter presets. *Trigger:* scaffolding in Phase 0 Part B.

### roadmap.md
- Phase 1 ordering: renderer-first vs. pipeline-first. *Trigger:* starting Phase 1.
- What audience signal counts as "validated" before monetization. *Trigger:* first
  sustained traffic.
