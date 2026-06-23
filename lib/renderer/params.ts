// The control -> stage param grammar and the renderer's runtime parameter store. Controls name a
// stage-kind-appropriate `param` (a dotted-path string); the renderer holds a flat map keyed by
// that exact string. Pure module (types only from the schema) so it imports cleanly into both the
// client components and node-environment unit tests. See foundation/artifact-schema.md.

import type { ArtifactDocV1 } from "@/lib/artifact-schema";

export type ParamValue = string | number | boolean;
export type ParamsMap = Record<string, ParamValue>;

type Stage = ArtifactDocV1["stage"];
type Control = ArtifactDocV1["controls"][number];
type Mol3D = Extract<Stage, { kind: "molecular3d" }>;
type Representation = Mol3D["representation"];

export const REPRESENTATIONS = ["cartoon", "surface", "sticks", "spheres"] as const;

// Highlight color used when an author declares a highlight without an explicit `color`.
export const DEFAULT_HIGHLIGHT_COLOR = "#e11d48"; // rose-600

// Per-stage-kind param vocabulary (the normative grammar lives in foundation/artifact-schema.md):
//   molecular3d -> "representation", "highlights.<id>.visible", "spin"
//   chart       -> "axes.y.log"
// Build the starting map: stage-derived defaults (the floor), then overlay each declared
// control's `default` (an author default wins over the floor). Unknown params are simply carried
// in the map and ignored by readers — forward-compatible.
export function initialParams(stage: Stage, controls: Control[]): ParamsMap {
  const params: ParamsMap = {};
  if (stage.kind === "molecular3d") {
    params["representation"] = stage.representation;
    params["spin"] = false;
    for (const h of stage.highlights) {
      params[`highlights.${h.id}.visible`] = true;
    }
  } else if (stage.kind === "chart") {
    params["axes.y.log"] = false;
  }
  for (const c of controls) {
    if (c.default !== undefined) params[c.param] = c.default;
  }
  return params;
}

// Typed readers. Each guards the loose ParamValue and falls back to the stage-derived default when
// the key is missing or holds an unexpected type — so a malformed param degrades, never throws.
export function getRepresentation(params: ParamsMap, stage: Mol3D): Representation {
  const v = params["representation"];
  return typeof v === "string" && (REPRESENTATIONS as readonly string[]).includes(v)
    ? (v as Representation)
    : stage.representation;
}

export function isHighlightVisible(params: ParamsMap, id: string): boolean {
  const v = params[`highlights.${id}.visible`];
  return v === undefined ? true : Boolean(v);
}

export function getSpin(params: ParamsMap): boolean {
  return Boolean(params["spin"]);
}

export function getYLog(params: ParamsMap): boolean {
  return Boolean(params["axes.y.log"]);
}
