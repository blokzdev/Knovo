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
| **Public accounts & comments** | Public is read-only at launch (Decision 5); schema already accommodates them (profiles + role). | Validated audience wants to save/bookmark/discuss. |
| **Monetization / payments** | No payments at MVP (Decision 7); requires Vercel Pro (Hobby is non-commercial). | Audience validated and a paid/ad model is chosen. |
| **SEO / OG / PWA polish** | Phase 0 branding was scoped to "unblock Google OAuth verification" (logo, favicon/app icons, MDX legal pages) only. OpenGraph/Twitter cards, sitemap, robots, web manifest, installable PWA deferred. | Phase 3 (site experience) or first public launch — see roadmap Phase 3. |
| **Rich marketing/legal/app pages** | Phase 0 `/legal/*` pages are intentionally minimal; landing/about/browse design deferred. | Phase 3 — content engine proven, ready to invest in public presence. |
| **Admin dashboard HUD** | Governed-autonomy pivot (2026-06-22) built the API + worker specs first ("foundation first"). The control HUD (queue, preview, comments, directives, publish/reject, run-now/fire buttons) is the next milestone. | Phase 1b — immediately after foundation lands. |
| **Single responsive renderer** | Needed for the HUD preview + public read site; deferred with the HUD. | Phase 1b. |
| **Fully-autonomous publish worker** | Current model requires an admin directive to publish. A worker that publishes without per-item direction is possible but deliberately not built. | Admin trusts the pipeline enough to drop the per-item publish gate. |
| **File attachments to worker directives** | The routine API trigger payload is text-only (no files). Admin file hand-off would go via storage + a referenced URL. | Admin needs to attach a file/image to a directive. |
| **Public series pages** | `series` table + membership exist; public series routes not built. | Public read site (Phase 1c). |

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
- Control `param` grammar (dotted path vs. typed enum). *Trigger:* paths become error-prone.
- three.js `selection` grammar (subset of PDB selection language) needs a v1 spec.
  *Trigger:* implementing the molecular3d renderer in Phase 1.

### security-and-privacy.md
- **Resolved (2026-06-22):** least-privilege is the **governed Knovo API with per-worker
  verb-scoped tokens** (service-role server-only inside the API); the `knovo_routine` DB role
  was dropped in 0004.
- `audit_log` now records every API mutation. Open: whether admin **dashboard** actions need
  richer audit beyond `reviewed_by`/`reviewed_at`. *Trigger:* need to answer "which admin
  changed this and when" in detail.
- Worker-token rotation/hardening (hash-at-rest vs. env compare). *Trigger:* more workers or a
  token-exposure scare.

### Site / branding (Phase 0 deploy)
- **Legal copy is unreviewed starter text.** `app/legal/privacy` and `app/legal/terms` were
  drafted to match Knovo's real architecture but are **not** legal advice. *Trigger:* before
  public launch / before relying on them — get a qualified human review; replace the
  `privacy@knovo.ai` / `legal@knovo.ai` contact addresses and confirm the subprocessor list.
- **Logo is an SVG wordmark/monogram, not a bespoke designed mark.** *Trigger:* a brand/design
  pass (Phase 3) if a richer identity is wanted.

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
