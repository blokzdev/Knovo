"use client";

import { useCallback, useMemo, useState } from "react";
import type { ArtifactDocV1 } from "@/lib/artifact-schema";
import {
  initialParams,
  getYLog,
  REPRESENTATIONS,
  type ParamsMap,
  type ParamValue,
} from "@/lib/renderer/params";
import { ChartStage } from "./ChartStage";
import { Molecular3DStage } from "./Molecular3DStage";
import { DiagramStage } from "./DiagramStage";
import { ControlsBar } from "./ControlsBar";

type Stage = ArtifactDocV1["stage"];
type Control = ArtifactDocV1["controls"][number];

// When a molecular3d stage declares no representation control, synthesize a default `select` so
// the "switch representation" UX is preserved. Author-declared controls win — if any control
// already targets `representation`, nothing is added. The synthesized control is prepended so the
// representation picker stays prominent (as the previous hardcoded picker was).
function withSynthesizedControls(stage: Stage, controls: Control[]): Control[] {
  if (stage.kind !== "molecular3d") return controls;
  if (controls.some((c) => c.param === "representation")) return controls;
  const ids = new Set(controls.map((c) => c.id));
  let id = "representation";
  while (ids.has(id)) id = `_${id}`; // collision-safe id
  const synth: Control = {
    id,
    label: "Representation",
    kind: "select",
    target: stage.id,
    param: "representation",
    options: [...REPRESENTATIONS],
    default: stage.representation,
  };
  return [synth, ...controls];
}

// Owns the renderer's runtime parameter store and wires controls to the stage. Controls are
// controlled (values + onChange); each stage reads only the params it cares about.
export function InteractiveStage({ stage, controls }: { stage: Stage; controls: Control[] }) {
  const effectiveControls = useMemo(
    () => withSynthesizedControls(stage, controls),
    [stage, controls],
  );
  const [params, setParams] = useState<ParamsMap>(() => initialParams(stage, effectiveControls));
  const onChange = useCallback(
    (param: string, value: ParamValue) => setParams((p) => ({ ...p, [param]: value })),
    [],
  );

  if (stage.kind === "molecular3d") {
    return (
      <div className="space-y-3">
        <Molecular3DStage stage={stage} params={params} />
        <ControlsBar controls={effectiveControls} values={params} onChange={onChange} />
      </div>
    );
  }
  if (stage.kind === "chart") {
    return (
      <div className="space-y-3">
        <ChartStage stage={stage} yLog={getYLog(params)} />
        <ControlsBar controls={effectiveControls} values={params} onChange={onChange} />
      </div>
    );
  }
  return <DiagramStage />;
}
