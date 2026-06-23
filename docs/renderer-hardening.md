# Renderer hardening (Phase 1b-follow) — plan of record

This is the working plan for **1b-follow**: closing the gap between the slot schema
(`lib/artifact-schema.ts`, intentionally ahead) and the renderer (`components/renderer/`).
Captured so each PR can be planned in detail (plan tool) and approved before it is built. The
roadmap entry points here; `BACKLOG.md` tracks the deferred items this resolves.

Sequence: **PR0 (this) → PR1 → PR2 → PR3**, one branch/PR each, owner merges before the next
(no stacked PRs). PR0 is migration `0007` + this plan capture. The grammars below are the
**proposed v1 spec**; they become normative in `foundation/artifact-schema.md` when PR1 lands —
do not treat them as resolved until then.

> **Sequence note (2026-06-23):** PR0 and PR1 are merged. Two PRs were then inserted ahead of the
> remaining renderer work in the overall repo sequence — an **admin BYOK settings** page (done,
> `0008`) and a **dedicated design-system & layout elevation** (planned). This doc's internal
> numbering is unchanged; PR2 (tldraw) and PR3 (immersive) below are simply scheduled after those.

## The four gaps (verified in code)
1. **Controls are inert.** `ControlsBar.tsx` renders toggle/slider/select/stepper widgets with
   local `useState`; nothing drives the stage. Only molecular3d `representation` is wired, via a
   hardcoded picker in `InteractiveStage.tsx`. The schema's `control.param` (dotted path) +
   `control.target` (= stage id) grammar is unconsumed.
2. **molecular3d highlights don't render.** `molecular3d.highlights[]` = `{id, selection, color?}`
   exists, but `Molecular3DStage.tsx` only lists them as captions; `selection` is never applied
   to the 3Dmol viewer, and `initialCamera.preset` is ignored.
3. **diagram is a placeholder.** `diagramStage` carries a tldraw `snapshot`, but `DiagramStage.tsx`
   is a stub.
4. **No immersive mode.** Only portrait + landscape exist; `artifact-schema.md`'s layout table
   defines an immersive mode (fullscreen stage / drawer panels / overlay controls) that isn't built.

> Note: molecular3d is rendered with **3Dmol.js** (not three.js). The stray "three.js" references
> in `artifact-schema.md` were corrected in PR0.

## Locked decisions (owner, 2026-06-22)
- **Tests:** add **vitest** in PR1 (devDep + `npm test` + a CI step) and unit-test the pure
  `parseSelection` + param-init logic. Resolves the BACKLOG "test strategy depth" trigger.
- **Demo seed:** a guarded service-role `scripts/seed-demo-artifact.ts` inserts one clearly-marked,
  real-PDB demo artifact (highlights + representation control + per-highlight visibility toggles +
  spin) and a chart with a y-log toggle, **published to PROD**, soft-deletable after verification.
  Reuses `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (no new env vars).
- **Branches:** one branch/PR; owner merges between.

---

## Proposed v1 grammars (land in PR1)

### Control → stage param grammar
`control.target` must equal the stage `id`. `control.param` names a stage-kind-appropriate
parameter. The renderer owns a single `params` map keyed by `param`; unknown params are ignored
gracefully (forward-compatible).

| stage kind | `param` | type | meaning |
|---|---|---|---|
| `molecular3d` | `representation` | enum `cartoon \| surface \| sticks \| spheres` | base style for the whole structure |
| `molecular3d` | `highlights.<id>.visible` | boolean | show/hide colored highlight `<id>` over the base style |
| `molecular3d` | `spin` | boolean | auto-rotate the viewer |
| `chart` | `axes.y.log` | boolean | log scale on the Y axis |
| `diagram` | — | — | no params in v1 (read-only) |

Initialization (PR1, `lib/renderer/params.ts`): start from stage-derived defaults
(`representation` = stage.representation; each `highlights.<id>.visible` = true; `spin` = false;
`axes.y.log` = false), then overlay each declared `control.default`. When a molecular3d stage
declares **no** `representation` control, the renderer **synthesizes** a default representation
`select` control so the existing "switch representation" UX is preserved.

### molecular3d selection grammar (subset of PDB selection language)
`parseSelection(sel)` (PR1, pure, in `lib/renderer/selection.ts`) → a 3Dmol `AtomSelectionSpec`.
Supported v1 subset:

| input | → AtomSelectionSpec |
|---|---|
| `chain X` | `{ chain: "X" }` |
| `resi N` | `{ resi: [N] }` |
| `resi N-M` | `{ resi: [N..M] }` (range expanded to an int array) |
| `resi N,M,…` | `{ resi: [N, M, …] }` |
| `chain X and resi N-M` | `{ chain: "X", resi: [N..M] }` |

Rules: whitespace-tolerant; chain id upper-cased; `and` merges clause keys; ranges expand to
inclusive int arrays for determinism. **Unparseable input → `null`**, and the caller skips that
highlight (degrade gracefully, never throw). This is the case unit tests target.

Apply order in the viewer: `setStyle({}, styleFor(rep))` (base), then for each **visible**
highlight `addStyle(parseSelection(h.selection), coloredStyle(rep, h.color))`. Recompute
idempotently from scratch on any param change.

---

## PR1 — Interactive controls + 3D highlights (coupled; highest value)
**Goal:** controls drive the stage; highlights render colored + toggle; spin + chart log work.

Scope:
- Lift control state into `InteractiveStage` (owns the `params` map). Make `ControlsBar`
  controlled (`values` + `onChange`); drop its internal `useState`.
- New `lib/renderer/params.ts` (grammar + `initialParams`) and `lib/renderer/selection.ts`
  (`parseSelection`).
- Remove the hardcoded representation picker; route `representation` through params; synthesize a
  default rep control when none is declared.
- `Molecular3DStage`: apply highlights via `addStyle` over the base style, driven by
  `highlights.<id>.visible`; wire `spin`; best-effort `initialCamera.preset` (advisory). Extend
  the `MolViewer` type stub (`addStyle`, `spin`).
- `ChartStage`: `axes.y.log` → recharts `<YAxis scale="log" domain={['auto','auto']}
  allowDataOverflow />` when on (log needs positive values).
- **vitest**: add devDep + `npm test` script + CI step; tests for `parseSelection` and
  `initialParams`.
- Docs: finalize both grammars (the normative tables) in `foundation/artifact-schema.md`;
  mark the two resolved open questions in `BACKLOG.md`; **regenerate `docs/routines.md`** with the
  valid `param`/`selection` values + a paste-ready block (routine-regeneration rule).
- Seed: `scripts/seed-demo-artifact.ts` (→ prod), verify on the Vercel preview.

Files: `components/renderer/{InteractiveStage,ControlsBar,Molecular3DStage,ChartStage}.tsx`;
new `lib/renderer/{selection,params}.ts`; `foundation/artifact-schema.md`; `BACKLOG.md`;
`docs/routines.md`; `scripts/seed-demo-artifact.ts`; vitest config + tests; `.github/workflows/ci.yml`.

Acceptance: typecheck/lint/build/test green; on the preview, representation switches, each
highlight toggles its colored overlay, spin rotates, and the chart's y-log toggle re-scales.

## PR2 — tldraw diagram rendering
**Goal:** `diagram.snapshot` renders read-only.

Scope: add the `tldraw` dependency; `DiagramStage.tsx` becomes a real component receiving the
stage; render the snapshot **read-only**, lazy-loaded client-only (dynamic import, `ssr:false`,
hidden UI, zoom-to-fit, `isReadonly`) mirroring the 3Dmol pattern; `InteractiveStage` passes the
stage through. Keep tldraw strictly lazy (large bundle). Update `artifact-schema.md`/`BACKLOG.md`.
Extend the seed with a small diagram snapshot to verify.

Files: `components/renderer/{DiagramStage,InteractiveStage}.tsx`; `package.json`;
`foundation/artifact-schema.md`; `BACKLOG.md`; `scripts/seed-demo-artifact.ts`.

## PR3 — Immersive responsive mode
**Goal:** the immersive layout from `artifact-schema.md`'s table.

Scope: a fullscreen/expand toggle on the stage; fullscreen stage, panels in a collapsible
drawer, controls as a floating overlay, captions pinned, provenance as a collapsible sheet.
**Open UX forks (decide when we reach it):** Fullscreen API vs. in-page fixed overlay; shadcn
drawer vs. sheet for panels. Last because it is the most UX-design-heavy.

Files: `components/renderer/ArtifactRenderer.tsx` (+ likely a new `ImmersiveShell`);
`components/renderer/InteractiveStage.tsx`; `foundation/artifact-schema.md`; `BACKLOG.md`.

---

## Status
- [x] PR0 — migration `0007` (advisors 0028/0029) + this plan capture.
- [x] PR1 — interactive controls + 3D highlights (+ vitest, grammars, routines, seed).
- [ ] PR2 — tldraw diagram.
- [ ] PR3 — immersive mode.
