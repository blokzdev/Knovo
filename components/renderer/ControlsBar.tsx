"use client";

import { useState } from "react";
import type { ArtifactDocV1 } from "@/lib/artifact-schema";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Control = ArtifactDocV1["controls"][number];

// Renders the artifact's declared controls as live widgets. For v1 they hold local state; the
// full control→stage param grammar (driving the stage from arbitrary params) is a follow-up.
export function ControlsBar({ controls }: { controls: Control[] }) {
  if (controls.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      {controls.map((c) => (
        <ControlWidget key={c.id} control={c} />
      ))}
    </div>
  );
}

function ControlWidget({ control }: { control: Control }) {
  const [val, setVal] = useState<string | number | boolean | undefined>(control.default);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-neutral-600">{control.label}</span>
      {control.kind === "toggle" && (
        <Switch checked={Boolean(val)} onCheckedChange={(v) => setVal(v)} />
      )}
      {control.kind === "select" && (
        <Select value={val != null ? String(val) : undefined} onValueChange={(v) => setVal(v)}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {(control.options ?? []).map((o) => (
              <SelectItem key={String(o)} value={String(o)} className="text-xs">
                {String(o)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {control.kind === "slider" && (
        <input
          type="range"
          className="h-1.5 w-32 cursor-pointer accent-neutral-900"
          value={typeof val === "number" ? val : 0}
          onChange={(e) => setVal(Number(e.target.value))}
        />
      )}
      {control.kind === "stepper" && (
        <div className="inline-flex items-center gap-2">
          <button
            className="h-6 w-6 rounded border border-neutral-300 text-neutral-600 hover:bg-neutral-100"
            onClick={() => setVal((typeof val === "number" ? val : 0) - 1)}
          >
            −
          </button>
          <span className="min-w-5 text-center text-xs tabular-nums">
            {typeof val === "number" ? val : 0}
          </span>
          <button
            className="h-6 w-6 rounded border border-neutral-300 text-neutral-600 hover:bg-neutral-100"
            onClick={() => setVal((typeof val === "number" ? val : 0) + 1)}
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
