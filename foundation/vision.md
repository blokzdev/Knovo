# Vision

## What Knovo is
Knovo is an AI-authored library of interactive, source-grounded **explainers** in a narrow
domain: structural/molecular biology, molecular pharmacology, and de novo protein and drug
design. Each explainer is an interactive **artifact** — a 3D molecular structure (3Dmol.js),
a diagram (tldraw), and/or charts — that makes a single significant new finding legible in
minutes.

## Who it serves
Researchers, graduate students, and biotech/pharma practitioners working in or adjacent to
the niche. Not broad biomedical readers. Not patients or consumer-health audiences.

## The wedge
**Every significant new finding in this niche, rendered as an interactive artifact within
days of publication.** Claude authors the artifacts autonomously on a schedule, grounded in
primary sources (PDB, ChEMBL, PubMed, bioRxiv); a human admin reviews and publishes. The
moat is speed × trust: faster than a human team could produce, trustworthy because every
artifact is source-grounded and human-gated before it goes live.

## Why now / why this is possible
- Primary structural and pharmacological data is machine-accessible (PDB, ChEMBL, PubMed,
  bioRxiv have open APIs).
- Claude can read a finding, pull its primary sources, and compose a structured artifact.
- Scheduled autonomous routines (the web-app feature) can run this daily without standing
  infrastructure.
- Autonomous authoring is only acceptable because of two guardrails that are part of the
  product spine, not afterthoughts: **source-grounding** (every claim traces to a stored,
  verifiable source) and the **human publish gate** (nothing goes live without admin review).

## What success looks like (MVP horizon)
- A steady cadence of high-quality drafts the admin can review quickly.
- A small, returning audience of niche practitioners who trust the artifacts.
- Validated demand before any monetization. (No payments at MVP — validate audience first.)

## What Knovo is NOT (at launch)
- Not a general biomedical or patient-facing site.
- Not a social platform — public is read-only at launch (accounts/comments come later).
- Not a native app — web-first, responsive, PWA-capable; no Electron/Tauri/Capacitor.
- Not monetized yet.

## How vision constrains architecture (one example)
Because the bet is *discovery by niche practitioners and search engines*, published
artifacts are **server-rendered with clean, stable URLs and embedded structured data
(JSON-LD)** — not a client-only SPA. Discoverability is a first-class architectural
requirement that flows directly from this vision, and it shapes the rendering strategy in
`technical-architecture.md`.

## North star (future, owner-directed) — GemBlog, a multi-tenant AI Blog-as-a-Service
*(Recorded 2026-06-23. Vision, not current scope — see the scope-wall note below.)*

The platform this engine becomes is **GemBlog** (domain **gemblog.co**) — a **domain-agnostic,
multi-tenant "AI Blog-as-a-Service"** in which **Knovo is the molecular-science showcase tenant**.
The engine — a governed API + a slot-schema renderer + an editorial team of Claude routine workers
coordinated through a **worker-harness repo** (`worker-harness.md`) — is not specific to molecular
science. A new operator picks (or forks) a **domain** and runs their own source-grounded,
human-gated library at `‹name›.gemblog.co` (or a custom domain).

**Universal core + domain kits.** The generic spine — the slot/renderer/governance core (stage /
panel / controls / caption shape, the chart + diagram stages, panels, the kind-dispatching renderer,
the design system, and the whole validate→audit→publish-gate→soft-delete→version machinery) — is
**domain-neutral and shared by every tenant**. Each niche adds a **domain kit**: its domain-specific
**stage kinds** (Knovo's molecular kit = the `molecular3d` viewer + PDB selection grammar), its
**source vocabulary** (Knovo = PDB/ChEMBL/PubMed/bioRxiv), and its **voice/niche** conventions. The
provenance *contract* (≥1 stable, verifiable primary source) is universal; the source *registry* is
per-kit. Adding a kit is a reviewed schema version-bump + migration, never a renderer rewrite
(design: `artifact-schema.md` → "Generalization").

A tenant's **domain template** unifies three things: a **domain kit** (render/sources/schema) + a
**harness repo** (constitution + per-worker prompts) + a **shared environment** (connectors +
allowlist + env). The multi-tenant north star is "a registry of these templates."

Two capabilities make a template both reusable and customizable:
- **Modular / parametric prompts** — a worker's instructions are *composed*
  (`compose(domainTemplate, workerRoleModule, adminParams)`), so an operator tunes capabilities,
  style/flow, source-set, cadence, and triggers per worker without forking the prompt
  (`worker-harness.md` §7).
- **A four-agent editorial team** — Scout / Editor / Keeper / **Supervisor**, the Supervisor
  coordinating the shared harness (`worker-harness.md` §5).

**The wedge, productized:** an autonomous, source-grounded editorial team that runs your niche blog
— offered freemium (free `‹name›.gemblog.co` + metered generation; paid custom domains, higher
quotas, the autonomous Supervisor cadence). Model: `monetization.md`. Gated by Decision 7.

**Scope-wall.** This is the deliberate, owner-directed *direction of travel* — **not** current
scope. The narrow-niche invariant (`DECISIONS.md` Decision 1) **still governs the Knovo tenant**;
nothing multi-tenant, no domain kit, no parametric composer, no freemium, and no template registry
is built until its roadmap phase is pulled (`roadmap.md` → "Platform horizon"). The brand rename
(Knovo → GemBlog) and the decisions this all eventually touches are flagged in the `DECISIONS.md`
vision note so they are amended consciously, at phase start.

## Open questions
- Multi-tenant / Blog-as-a-Service north star: when (if ever) to pull it from vision into a phase,
  and which domain proves the template second. Trigger: the Knovo tenant is validated and a second
  domain is wanted. (See `BACKLOG.md`.)
- Primary-source set is fixed at PDB/ChEMBL/PubMed/bioRxiv for v1. Trigger to revisit:
  repeated high-value findings whose primary source lives elsewhere (e.g. UniProt, EMDB).
- Cadence (daily) and volume per run (one artifact) are starting points. Trigger to
  revisit: admin review throughput proves higher or lower than one/day.
