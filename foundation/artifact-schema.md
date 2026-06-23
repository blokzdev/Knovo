# Artifact Schema (the core domain spec)

An **artifact** is a structured document conforming to a **versioned slot schema**, stored
as JSONB. The routine **fills slots**; it never emits layout code and never escapes the
vocabulary. **One responsive renderer** owns all layout and turns slots into the three
layout modes (portrait / landscape / immersive). The v1 vocabulary is intentionally
minimal and grows only by deliberate, reviewed schema change + version bump; older
artifacts must keep rendering after a bump.

## Document shape (v1)
```jsonc
{
  "schemaVersion": 1,
  "title": "…",
  "summary": "…",                  // short abstract (cards + JSON-LD)
  "stage": { Stage },              // exactly one primary visualization surface
  "panels": [ Panel, … ],          // supporting static blocks (0+)
  "controls": [ Control, … ],      // interactive controls that drive the stage (0+)
  "captions": [ Caption, … ]       // annotations bound to a slot (0+)
  // provenanceFooter is NOT in the document — it is auto-rendered from stored provenance.
}
```
Every slot carries a stable `id` (string). Relationships are expressed by id reference.

## Slot vocabulary

### stage — the primary visualization surface
Discriminated union on `kind`:

- **`molecular3d`** (rendered with 3Dmol.js):
  ```jsonc
  { "id": "stage", "kind": "molecular3d",
    "source": { "db": "pdb", "uid": "8ABC" },   // resolves to a structure
    "representation": "cartoon",                 // cartoon | surface | sticks | spheres
    "highlights": [                              // referenced by controls/captions
      { "id": "binder",    "selection": "chain B",            "color": "#e11" },
      { "id": "interface", "selection": "chain A and resi 45-58", "color": "#1a7" }
    ],
    "initialCamera": { "preset": "overview" } }
  ```
- **`diagram`** (rendered read-only as a static SVG via tldraw's `TldrawImage`, then wrapped in a
  lightweight pan/zoom container — no tldraw editor is mounted; no params in v1):
  ```jsonc
  { "id": "stage", "kind": "diagram", "snapshot": { /* tldraw store snapshot: { store, schema } */ } }
  ```
- **`chart`**:
  ```jsonc
  { "id": "stage", "kind": "chart", "chartType": "bar",       // line | bar | scatter
    "axes": { "x": "target", "y": "IC50 (nM)" },
    // each data point is keyed by axes.x and axes.y (the renderer reads those exact keys):
    "series": [ { "name": "compound X",
      "data": [ { "target": "Y", "IC50 (nM)": 8 }, { "target": "Z", "IC50 (nM)": 470 } ] } ] }
  ```

(Charts may also appear as panels; the *stage* is the single hero surface. v1 allows one
stage per artifact.)

### panels[] — supporting static blocks
```jsonc
{ "id": "method", "kind": "prose",    "content": "markdown text" }
{ "id": "facts",  "kind": "keyvalue", "content": [ { "k": "Method", "v": "RFdiffusion" } ] }
{ "id": "fig1",   "kind": "figure",   "content": { "src": "…", "alt": "…" } }
```

### controls[] — interactive controls that drive the stage
Each control names the **stage** it drives and the **parameter** it sets.
```jsonc
{ "id": "show-binder", "label": "Show binder", "kind": "toggle",
  "target": "stage", "param": "highlights.binder.visible", "default": true }

{ "id": "rep", "label": "Representation", "kind": "select",
  "target": "stage", "param": "representation",
  "options": ["cartoon","surface","sticks"], "default": "cartoon" }
```
`kind ∈ toggle | slider | select | stepper`. **`control.target` must reference a stage id**;
**`param`** must name a stage-kind-appropriate parameter (below).

#### Param grammar (per stage kind) — v1
`param` is a dotted-path string; the renderer holds a flat map keyed by the exact `param`, and
each declared control's `default` seeds it (over a stage-derived floor). Unknown params are
carried but ignored, so the vocabulary can grow without breaking older artifacts.

| stage kind | `param` | type | effect |
|---|---|---|---|
| `molecular3d` | `representation` | enum `cartoon \| surface \| sticks \| spheres` | base style of the whole structure |
| `molecular3d` | `highlights.<id>.visible` | boolean | show/hide colored highlight `<id>` over the base style |
| `molecular3d` | `spin` | boolean | auto-rotate the viewer |
| `chart` | `axes.y.log` | boolean | log-scale the Y axis (positive values only) |

If a `molecular3d` stage declares **no** control with `param: "representation"`, the renderer
synthesizes a default representation `select` so the picker is always available.

#### Highlight selection grammar (molecular3d) — v1
`highlights[].selection` is a small, documented subset of the PDB selection language. The renderer
parses it to a 3Dmol atom selection and paints the highlight's `color` over the base representation;
visibility is driven by the `highlights.<id>.visible` param.

| form | matches |
|---|---|
| `chain X` | all atoms in chain X (id upper-cased) |
| `resi N` | residue N |
| `resi N-M` | residues N…M (inclusive) |
| `resi N,M` | residues N and M (list entries may themselves be ranges) |
| `chain X and resi N-M` | the intersection |

Whitespace-tolerant; keywords are case-insensitive; clauses compose with `and`. An **unparseable**
selection (unknown keyword, non-integer residue, reversed range like `5-2`, or a duplicated key)
renders no highlight — the rest of the artifact still renders.

### captions[] — annotations bound to a slot
```jsonc
{ "id": "cap-iface", "target": "stage", "text": "Hot-spot residues at the interface." }
{ "id": "cap-method", "target": "method", "text": "Designed de novo, not a natural binder." }
```
**`caption.target` must reference an existing slot id** (a stage, panel, or — for a
highlight callout — a stage highlight id via `stage:<highlightId>`).

### provenanceFooter — auto-rendered, never authored
Generated by the renderer from `artifact_sources` + `sources`: each source's identifier,
citation, canonical URL, and retrieval date. Not part of the document, so it cannot be
forged or omitted by the routine.

## Slot relationships (validated)
| reference | must point to | meaning |
|---|---|---|
| `control.target` | a `stage.id` | which control drives which stage |
| `control.param` | a valid param for that stage's `kind` | what the control changes |
| `caption.target` | any slot id (`stage` / panel id / `stage:<highlightId>`) | which slot a caption annotates |
| `stage.source` | `{db, uid}` present in `sources` | grounding of the visualization |

zod refinements enforce these cross-references at validation time; dangling references fail
validation and the artifact is not stored.

## zod validation
- Each slot `kind` has its own zod object; `stage` and `panel` are discriminated unions on
  `kind`.
- The document schema (`artifactSchemaV1`) composes them and adds `.superRefine()` checks
  for the relationship table above.
- The routine parses its output with `artifactSchemaV(schemaVersion)` **before** insert;
  the renderer parses again defensively on read.

## Versioning & migration
- `schemaVersion` is an integer stored on the row and in the document.
- The renderer keeps a handler for **every** version ≤ current; on read it runs forward
  **normalize-on-read migrations** (`migrateV1toV2`, …) to the current shape. Stored rows
  are not rewritten, so **old artifacts keep rendering after a bump**.
- Growing the vocabulary = a reviewed schema change + a version bump + a migration + a
  regeneration of `docs/routines.md` (per `CLAUDE.md`). The routine only ever emits the
  current version.

## Responsive layout mapping (renderer-owned)
| slot | portrait | landscape | immersive |
|---|---|---|---|
| stage | top, full width, reduced height | main/left column | fullscreen canvas |
| panels | stacked below stage | right column | collapsible drawer |
| controls | horizontal bar under stage | docked beside stage | floating overlay |
| captions | inline under target | margin notes | pinned labels |
| provenanceFooter | pinned bottom, collapsible | pinned bottom, collapsible | collapsible sheet |

The routine is unaware of these modes; it only fills slots. Changing layout changes the
renderer once, for all artifacts.

---

## Worked example 1 — a de novo binder structure
A new mini-binder designed against a target; structure deposited in PDB.
```jsonc
{
  "schemaVersion": 1,
  "title": "A de novo mini-binder against target X",
  "summary": "A computationally designed 60-residue binder engages target X at a hot-spot interface.",
  "stage": {
    "id": "stage", "kind": "molecular3d",
    "source": { "db": "pdb", "uid": "8ABC" },
    "representation": "cartoon",
    "highlights": [
      { "id": "target",    "selection": "chain A", "color": "#888" },
      { "id": "binder",    "selection": "chain B", "color": "#e11" },
      { "id": "interface", "selection": "chain A and resi 45-58", "color": "#1a7" }
    ],
    "initialCamera": { "preset": "interface" }
  },
  "panels": [
    { "id": "method", "kind": "prose",
      "content": "Designed de novo with a diffusion model; top design validated by crystallography." },
    { "id": "facts", "kind": "keyvalue",
      "content": [ { "k": "Length", "v": "60 aa" }, { "k": "KD", "v": "12 nM" } ] }
  ],
  "controls": [
    { "id": "t-binder",    "label": "Show binder",    "kind": "toggle", "target": "stage", "param": "highlights.binder.visible",    "default": true },
    { "id": "t-interface", "label": "Show interface", "kind": "toggle", "target": "stage", "param": "highlights.interface.visible", "default": true },
    { "id": "rep",         "label": "Representation",  "kind": "select", "target": "stage", "param": "representation", "options": ["cartoon","surface","sticks"], "default": "cartoon" }
  ],
  "captions": [
    { "id": "cap-iface",  "target": "stage:interface", "text": "Designed hot-spot residues bury into target X." },
    { "id": "cap-method", "target": "method",          "text": "De novo — no natural homolog." }
  ]
}
```
Provenance (stored separately, rendered as footer): PDB `8ABC` (primary) + the bioRxiv/PubMed
report (primary or supporting) with citations.

## Worked example 2 — a small-molecule activity profile (ChEMBL)
A kinase inhibitor's selectivity across targets.
```jsonc
{
  "schemaVersion": 1,
  "title": "Selectivity profile of compound CHEMBL123",
  "summary": "IC50 of CHEMBL123 across a kinase panel shows >50× selectivity for target Y.",
  "stage": {
    "id": "stage", "kind": "chart", "chartType": "bar",
    "axes": { "x": "target", "y": "IC50 (nM)" },
    "series": [ { "name": "CHEMBL123", "data": [
      { "target": "Y", "IC50 (nM)": 8 }, { "target": "Z", "IC50 (nM)": 470 }, { "target": "W", "IC50 (nM)": 1200 } ] } ]
  },
  "panels": [
    { "id": "moa", "kind": "prose", "content": "ATP-competitive inhibitor; mechanism from ChEMBL." }
  ],
  "controls": [
    { "id": "scale", "label": "Log scale", "kind": "toggle", "target": "stage", "param": "axes.y.log", "default": true }
  ],
  "captions": [
    { "id": "cap-sel", "target": "stage", "text": "Lower is more potent; target Y is the clear outlier." }
  ]
}
```
Provenance: ChEMBL `CHEMBL123` (primary) with bioactivity citation + the source publication
(PMID).

## Open questions
- Allow more than one stage per artifact (e.g. structure + chart side by side)? v1 = one
  stage. Trigger: a finding genuinely needs two co-equal hero surfaces.
- **Resolved (1b-follow PR1):** the control `param` grammar — v1 keeps dotted paths with a
  per-stage-kind whitelist (see *Param grammar* above; renderer in `lib/renderer/params.ts`).
- **Resolved (1b-follow PR1):** the molecular3d `selection` grammar — v1 subset specified above
  (*Highlight selection grammar*) and implemented as `parseSelection` (`lib/renderer/selection.ts`)
  → 3Dmol atom selection, mapping `highlights[].selection` to colored styles.
