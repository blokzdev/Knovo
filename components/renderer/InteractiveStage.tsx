"use client";

import { useState } from "react";
import type { ArtifactDocV1 } from "@/lib/artifact-schema";
import { cn } from "@/lib/utils";
import { ChartStage } from "./ChartStage";
import { Molecular3DStage } from "./Molecular3DStage";
import { DiagramStage } from "./DiagramStage";
import { ControlsBar } from "./ControlsBar";

type Stage = ArtifactDocV1["stage"];
type Control = ArtifactDocV1["controls"][number];
type Mol3D = Extract<Stage, { kind: "molecular3d" }>;

const REPS: Mol3D["representation"][] = ["cartoon", "surface", "sticks", "spheres"];

export function InteractiveStage({ stage, controls }: { stage: Stage; controls: Control[] }) {
  if (stage.kind === "molecular3d") {
    return <Molecular3DInteractive stage={stage} controls={controls.filter((c) => c.param !== "representation")} />;
  }
  if (stage.kind === "chart") {
    return (
      <div className="space-y-3">
        <ChartStage stage={stage} />
        <ControlsBar controls={controls} />
      </div>
    );
  }
  return <DiagramStage />;
}

function Molecular3DInteractive({ stage, controls }: { stage: Mol3D; controls: Control[] }) {
  const [rep, setRep] = useState<Mol3D["representation"]>(stage.representation);
  return (
    <div className="space-y-3">
      <Molecular3DStage stage={stage} representation={rep} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-neutral-500">Representation</span>
        <div className="inline-flex rounded-md border border-neutral-200 bg-white p-0.5">
          {REPS.map((r) => (
            <button
              key={r}
              onClick={() => setRep(r)}
              className={cn(
                "rounded px-2.5 py-1 text-xs capitalize transition-colors",
                r === rep ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <ControlsBar controls={controls} />
    </div>
  );
}
