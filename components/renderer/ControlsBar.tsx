"use client";

import type { ArtifactDocV1 } from "@/lib/artifact-schema";
import type { ParamsMap, ParamValue } from "@/lib/renderer/params";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Control = ArtifactDocV1["controls"][number];

// Renders the artifact's declared controls as live widgets. Controlled: each widget's value lives
// in the parent's params map (keyed by control.param) and changes flow up via onChange, so the
// controls actually drive the stage. See lib/renderer/params.ts for the param grammar.
export function ControlsBar({
  controls,
  values,
  onChange,
}: {
  controls: Control[];
  values: ParamsMap;
  onChange: (param: string, value: ParamValue) => void;
}) {
  if (controls.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      {controls.map((c) => (
        <ControlWidget
          key={c.id}
          control={c}
          value={values[c.param] ?? c.default}
          onChange={onChange}
        />
      ))}
    </div>
  );
}

function ControlWidget({
  control,
  value,
  onChange,
}: {
  control: Control;
  value: ParamValue | undefined;
  onChange: (param: string, value: ParamValue) => void;
}) {
  const num = typeof value === "number" ? value : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-neutral-600">{control.label}</span>
      {control.kind === "toggle" && (
        <Switch checked={Boolean(value)} onCheckedChange={(v) => onChange(control.param, v)} />
      )}
      {control.kind === "select" && (
        <Select
          value={value != null ? String(value) : undefined}
          onValueChange={(v) => onChange(control.param, v)}
        >
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
          value={num}
          onChange={(e) => onChange(control.param, Number(e.target.value))}
        />
      )}
      {control.kind === "stepper" && (
        <div className="inline-flex items-center gap-2">
          <button
            className="h-6 w-6 rounded border border-neutral-300 text-neutral-600 hover:bg-neutral-100"
            onClick={() => onChange(control.param, num - 1)}
          >
            −
          </button>
          <span className="min-w-5 text-center text-xs tabular-nums">{num}</span>
          <button
            className="h-6 w-6 rounded border border-neutral-300 text-neutral-600 hover:bg-neutral-100"
            onClick={() => onChange(control.param, num + 1)}
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
