"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import type { ArtifactDocV1 } from "@/lib/artifact-schema";
import {
  initialParams,
  getYLog,
  REPRESENTATIONS,
  type ParamsMap,
  type ParamValue,
} from "@/lib/renderer/params";
import { useImmersive } from "@/lib/renderer/use-immersive";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChartStage } from "./ChartStage";
import { Molecular3DStage } from "./Molecular3DStage";
import { DiagramStage } from "./DiagramStage";
import { ControlsBar } from "./ControlsBar";
import { CaptionList } from "./CaptionList";
import { ImmersiveChrome } from "./ImmersiveChrome";
import type { ProvenanceSource } from "./ProvenanceFooter";

type Stage = ArtifactDocV1["stage"];
type Control = ArtifactDocV1["controls"][number];
type Caption = ArtifactDocV1["captions"][number];
type Panel = ArtifactDocV1["panels"][number];

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

// Owns the renderer's runtime parameter store and the immersive (expand-to-fullscreen) state.
// Controls are controlled (values + onChange); each stage reads only the params it cares about.
//
// Immersive mode is an in-page overlay: the SAME stage element stays mounted (stable key) and its
// container is CSS-promoted to `fixed inset-0`, so expanding never reloads the live 3Dmol/tldraw
// viewer or loses camera/zoom/control state. The overlay sits at z-40 so Radix popovers that
// portal to <body> at z-50 (the Select dropdown, the panels/provenance Sheets) layer above it.
// Title/panels/captions/sources are passed through purely for the immersive chrome; in normal mode
// they are ignored (ArtifactRenderer renders the captions/panels/footer itself, unchanged).
export function InteractiveStage({
  stage,
  controls,
  title = "",
  panels = [],
  captions = [],
  sources = [],
}: {
  stage: Stage;
  controls: Control[];
  title?: string;
  panels?: Panel[];
  captions?: Caption[];
  sources?: ProvenanceSource[];
}) {
  const effectiveControls = useMemo(
    () => withSynthesizedControls(stage, controls),
    [stage, controls],
  );
  const [params, setParams] = useState<ParamsMap>(() => initialParams(stage, effectiveControls));
  const onChange = useCallback(
    (param: string, value: ParamValue) => setParams((p) => ({ ...p, [param]: value })),
    [],
  );

  const [immersive, setImmersive] = useState(false);
  const exitButtonRef = useRef<HTMLButtonElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const exit = useCallback(() => setImmersive(false), []);
  useImmersive({ active: immersive, onExit: exit, exitButtonRef, returnFocusRef: expandButtonRef });

  const stageCaptions = captions.filter(
    (c) => c.target === stage.id || c.target.startsWith("stage:"),
  );

  // The single mounted stage element (the live viewer); `fill` makes it fill the immersive area.
  const stageView =
    stage.kind === "molecular3d" ? (
      <Molecular3DStage stage={stage} params={params} fill={immersive} />
    ) : stage.kind === "chart" ? (
      <ChartStage stage={stage} yLog={getYLog(params)} fill={immersive} />
    ) : stage.kind === "diagram" ? (
      <DiagramStage stage={stage} fill={immersive} />
    ) : null;

  const controlsBar = (
    <ControlsBar controls={effectiveControls} values={params} onChange={onChange} />
  );

  return (
    <div
      className={cn(
        immersive
          ? "fixed inset-0 z-40 flex flex-col gap-3 bg-background p-3 sm:p-4"
          : "relative space-y-3",
      )}
    >
      {immersive && (
        <ImmersiveChrome
          key="immersive-chrome"
          title={title}
          captions={captions}
          panels={panels}
          sources={sources}
          onExit={exit}
          exitButtonRef={exitButtonRef}
        />
      )}

      {/* Stable key keeps this subtree (and the live viewer inside it) mounted across the toggle. */}
      <div key="stage-region" className={cn("relative", immersive && "min-h-0 flex-1")}>
        {stageView}

        {!immersive && (
          <Button
            ref={expandButtonRef}
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setImmersive(true)}
            aria-label="Expand to fullscreen"
            title="Expand to fullscreen"
            className="absolute right-2 top-2 z-10 h-8 w-8 bg-card/80 backdrop-blur"
          >
            <Maximize2 />
          </Button>
        )}

        {immersive && stageCaptions.length > 0 && (
          <div className="absolute left-2 top-2 z-10 max-w-[min(320px,70%)] rounded-lg border border-border bg-card/85 p-2.5 backdrop-blur">
            <CaptionList captions={stageCaptions} />
          </div>
        )}

        {immersive && effectiveControls.length > 0 && (
          <div className="absolute inset-x-2 bottom-2 z-10 mx-auto w-fit max-w-[calc(100%-1rem)] overflow-x-auto rounded-lg">
            {controlsBar}
          </div>
        )}
      </div>

      {!immersive && controlsBar}
    </div>
  );
}
