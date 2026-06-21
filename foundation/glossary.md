# Glossary

## Project terms
- **Artifact** — a structured, interactive explainer document conforming to the versioned
  slot schema, stored as JSONB and rendered by the single renderer.
- **Slot** — a typed field in the artifact document the routine fills: `stage`, `panel`,
  `controls`, `caption`. The routine fills slots; it never emits layout.
- **Stage** — the primary visualization surface of an artifact (`molecular3d`, `diagram`,
  or `chart`).
- **Panel** — a supporting static block (prose / key-value / figure).
- **Control** — an interactive control that drives the stage (toggle/slider/select/stepper).
- **Caption** — a short annotation bound to a slot.
- **Provenance footer** — the auto-rendered source/citation block; generated from stored
  provenance, never authored by the routine.
- **Slot schema** — the versioned vocabulary + document shape; validated with zod; grows
  only by reviewed version bump.
- **Renderer** — the single responsive component that owns all layout (portrait/landscape/
  immersive) and turns a slot document into a rendered artifact.
- **Routine** — the scheduled Claude job that autonomously drafts artifacts.
- **Publish gate** — the human-in-the-loop step: admin promotes a draft to published or
  rejects it; nothing auto-publishes.
- **Provenance** — stored origin of an artifact's content: source DB, stable identifier,
  URL, citation, retrieval time, raw metadata.
- **Dedup** — suppressing a draft whose primary source was already seen or rejected.
- **Status lifecycle** — `draft → published | rejected`; rejected is terminal.

## Roles & infra
- **Admin** — the privileged human user (Google OAuth, `admin` role).
- **Viewer** — default profile role; public reader (no account at MVP).
- **Routine credential** — the least-privilege Supabase identity the routine uses;
  insert-only on drafts.
- **Service-role key** — Supabase key that bypasses RLS; server-only, never client-side,
  never used by the routine.
- **RLS** — Postgres Row-Level Security; default-deny policies enforce who sees/writes what.

## Domain terms (the niche)
- **PDB** — Protein Data Bank; repository of 3D macromolecular structures. Stable id: PDB ID
  (e.g. `8ABC`). Accessed via the public RCSB/PDB API.
- **ChEMBL** — curated database of bioactive molecules; stable id: ChEMBL ID (e.g.
  `CHEMBL123`). Source of bioactivity (IC50/Ki/EC50) and mechanism data.
- **PubMed** — biomedical literature index; stable id: PMID.
- **bioRxiv** — preprint server for biology (not peer-reviewed); stable id: DOI.
- **De novo design** — designing proteins/binders from scratch (not derived from a natural
  template), e.g. with diffusion models.
- **Binder** — a (often small, designed) protein that binds a target; a **de novo binder**
  is designed rather than evolved.
- **Interface / hot-spot residues** — the residues where a binder contacts its target.
- **Representation** — how a structure is drawn (cartoon/surface/sticks/spheres).
- **IC50 / Ki / EC50** — quantitative potency/affinity measures for compounds vs. targets.
- **Mechanism of action (MoA)** — how a compound produces its effect (e.g. ATP-competitive
  inhibition).
- **Molecular pharmacology** — study of how molecules (drugs) interact with biological
  targets — within scope.
