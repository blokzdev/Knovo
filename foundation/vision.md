# Vision

## What Knovo is
Knovo is an AI-authored library of interactive, source-grounded **explainers** in a narrow
domain: structural/molecular biology, molecular pharmacology, and de novo protein and drug
design. Each explainer is an interactive **artifact** — a 3D molecular structure (three.js),
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

## Open questions
- Primary-source set is fixed at PDB/ChEMBL/PubMed/bioRxiv for v1. Trigger to revisit:
  repeated high-value findings whose primary source lives elsewhere (e.g. UniProt, EMDB).
- Cadence (daily) and volume per run (one artifact) are starting points. Trigger to
  revisit: admin review throughput proves higher or lower than one/day.
