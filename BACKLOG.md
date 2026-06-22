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

---

## Open questions (each with a resolution trigger)

### From the routine UI / connectors
- **No PDB connector exists** in the routine's connector list, yet PDB is a locked source.
  Plan: the routine reaches PDB via the public RCSB/PDB REST API (web fetch). *Trigger:*
  PDB fetching proves unreliable or a first-class connector becomes available.
- **Connectors run writes without per-action prompts.** Attach only what the routine needs
  (bioRxiv, ChEMBL, PubMed, tldraw, Supabase); remove the rest. *Trigger:* the routine needs
  a new data source — re-evaluate the attached set and re-confirm RLS bounds the writer.

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
- `published` edits: new version row vs. mutate in place. *Trigger:* first correction to a
  live artifact.
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
- Handling a cited source that is later retracted/updated after publish. *Trigger:* first
  retraction of a cited source.

### artifact-schema.md
- Allow more than one stage per artifact? (v1: one.) *Trigger:* a finding needs two
  co-equal hero surfaces.
- Control `param` grammar (dotted path vs. typed enum). *Trigger:* paths become error-prone.
- three.js `selection` grammar (subset of PDB selection language) needs a v1 spec.
  *Trigger:* implementing the molecular3d renderer in Phase 1.

### security-and-privacy.md
- Exact mechanism for the routine's least-privilege Supabase credential (DB role vs.
  restricted API key vs. scoped service account). *Trigger:* wiring the routine's Supabase
  auth in Phase 0 Part B.
- Admin audit log beyond `reviewed_by`/`reviewed_at`. *Trigger:* first need to answer "who
  changed this and when".

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
