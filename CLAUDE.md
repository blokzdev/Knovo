# CLAUDE.md — Knovo memory harness

Knovo is an AI-authored library of interactive, source-grounded explainers in
structural/molecular biology, molecular pharmacology, and de novo protein/drug design.
Claude **routine workers** author and iterate artifacts; the **admin dashboard is a control
HUD** where a human directs the work (status markers + natural-language comments) and the
public-publish action is admin-directed. See the 2026-06-22 governed-autonomy amendment in
`DECISIONS.md`.

This file is the memory harness for every session. Read it first, every time.

## Doc-reading order (every session, before acting)
1. `CLAUDE.md` (this file) — protocol + invariants.
2. `DECISIONS.md` — the nine locked decisions (frozen).
3. `BACKLOG.md` — deferred scope + open questions (live state).
4. `foundation/content-integrity.md` — the spine (source-grounding + publish gate).
5. `foundation/artifact-schema.md` — the core domain spec (slots, zod, versioning, layout).
6. Then, as relevant to the task: `foundation/vision.md`, `PRD.md`,
   `technical-architecture.md`, `data-model.md`, `agent-architecture.md`,
   `security-and-privacy.md`, `deployment.md`, `build-conventions.md`, `roadmap.md`,
   `glossary.md`, `docs/routines.md`, and `docs/design-system.md`.

## Standing invariants (never violate; if tempted, log to BACKLOG.md and ask)
1. **Governed publish gate.** Workers act **only through the governed Knovo API**, which is
   the single write boundary. Workers may create/iterate/publish/archive content, but
   **publishing (and editing/archiving live content) requires an admin directive** set in the
   dashboard; nothing reaches the public except via that gate; deletes are soft (recoverable);
   rejected findings are not re-drafted. (Amended 2026-06-22.)
2. **Source-grounding.** Every artifact has ≥1 primary source (PDB/ChEMBL/PubMed/bioRxiv)
   with a stable identifier and a verifiable citation, stored as provenance. No source → no
   draft.
3. **Slot schema / no-escape.** Workers fill slots only; never emit layout code, never escape
   the versioned vocabulary. Every write is zod-validated against the schema **before** storage
   (enforced in the Knovo API). One renderer owns all layout. Old artifacts must keep rendering
   after a version bump.
4. **Least privilege.** Workers authenticate to the Knovo API with **per-worker, verb-scoped
   bearer tokens** (enforced by the API, NOT the connector or prompt). The service-role key is
   server-only, used solely inside the API — never client-side, never by a worker, never via
   the management connector. No worker holds DDL/infra power. Zero secrets in the repo.
5. **Narrow niche.** Structural/molecular biology, molecular pharmacology, de novo design.
   Not broad biomedical, not patient-facing/consumer health.
6. **Scope wall.** When tempted to expand scope mid-phase, **log it to BACKLOG.md and do not
   implement.** Phases are completion-driven; don't start the next phase before its gate is
   verified and approved.

## Standard protocol (each session)
- Read the docs in order above before acting.
- Per-task commits to the working branch; CI verifies on push. Keep CI green.
- Drive mechanical decisions autonomously per `build-conventions.md`. Surface load-bearing
  UX/architecture decisions (multiple reasonable approaches) before committing to one.
- **Maintain BACKLOG.md every session.** Deferred scope and open questions both live there.
  Each foundation doc's Open-questions section mirrors into BACKLOG.md → Open questions; keep
  them in sync.
- **`.env.example` lockstep:** any new env var is added to `.env.example` in the same commit.
- Keep foundation docs concise and current — update the doc in the same change that
  invalidates it. Docs serve the ship, not the reverse.
- Stream-length self-management: at a clean commit, if the session is degrading, stop and
  suggest a fresh session.

## Routine-regeneration rule
Whenever the **schema**, **connectors**, or **generation flow** change: regenerate
`docs/routines.md` **and** output a **paste-ready block** so the operator can update the
routine in the Claude web app. `docs/routines.md` is the canonical source for the external
routine instructions. The admin dashboard (`/admin/settings`) surfaces these same per-worker
blocks for in-app copy via the typed mirror `lib/workers/routines.ts`; keep that file in lockstep
with `docs/routines.md` in the same change — `lib/workers/routines.test.ts` fails on any drift.

## Decision changes
The nine decisions in `DECISIONS.md` are frozen. If a change seems warranted, **write it to
BACKLOG.md and ask** — do not silently re-litigate.
