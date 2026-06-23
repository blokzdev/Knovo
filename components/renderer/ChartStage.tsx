"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ArtifactDocV1 } from "@/lib/artifact-schema";
import { useThemeColors } from "@/lib/use-theme-colors";
import { cn } from "@/lib/utils";

type ChartStageT = Extract<ArtifactDocV1["stage"], { kind: "chart" }>;

const PALETTE = ["#6366f1", "#06b6d4", "#f59e0b", "#10b981", "#f43f5e", "#a855f7"];

// recharts requires an explicit domain for a log scale to render; values must be positive (the
// y-log toggle is for positive metrics like IC50 — data positivity is the routine's responsibility).
const LOG_DOMAIN = ["auto", "auto"] as ["auto", "auto"];

export function ChartStage({
  stage,
  yLog,
  fill = false,
}: {
  stage: ChartStageT;
  yLog: boolean;
  fill?: boolean;
}) {
  // Avoid SSR/responsive width warnings — render the chart after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { grid, axis } = useThemeColors();
  // In immersive mode the stage fills its flex container; otherwise it's a fluid clamped height.
  const heightClass = fill ? "h-full" : "h-[clamp(260px,40vh,360px)]";

  const xKey = stage.axes.x;
  const yKey = stage.axes.y;
  const tick = { fontSize: 11, fill: axis };
  const tooltipStyle = {
    background: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    color: "hsl(var(--popover-foreground))",
    fontSize: 12,
  };
  const legendStyle = { fontSize: 12, color: "hsl(var(--muted-foreground))" };

  if (!mounted) {
    return <div className={cn(heightClass, "w-full animate-pulse rounded-lg bg-muted")} />;
  }

  return (
    <div className={cn(heightClass, "w-full rounded-lg border border-border bg-card p-3")}>
      <ResponsiveContainer width="100%" height="100%">
        {stage.chartType === "bar" ? (
          <BarChart>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey={xKey} tick={tick} stroke={axis} />
            <YAxis
              tick={tick}
              stroke={axis}
              scale={yLog ? "log" : "auto"}
              domain={yLog ? LOG_DOMAIN : undefined}
              allowDataOverflow={yLog}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={legendStyle} />
            {stage.series.map((s, i) => (
              <Bar key={s.name} data={s.data} dataKey={yKey} name={s.name} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </BarChart>
        ) : stage.chartType === "scatter" ? (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis type="number" dataKey={xKey} name={xKey} tick={tick} stroke={axis} />
            <YAxis
              type="number"
              dataKey={yKey}
              name={yKey}
              tick={tick}
              stroke={axis}
              scale={yLog ? "log" : "auto"}
              domain={yLog ? LOG_DOMAIN : undefined}
              allowDataOverflow={yLog}
            />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={tooltipStyle} />
            <Legend wrapperStyle={legendStyle} />
            {stage.series.map((s, i) => (
              <Scatter key={s.name} data={s.data} name={s.name} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </ScatterChart>
        ) : (
          <LineChart>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey={xKey} tick={tick} stroke={axis} />
            <YAxis
              tick={tick}
              stroke={axis}
              scale={yLog ? "log" : "auto"}
              domain={yLog ? LOG_DOMAIN : undefined}
              allowDataOverflow={yLog}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={legendStyle} />
            {stage.series.map((s, i) => (
              <Line
                key={s.name}
                data={s.data}
                dataKey={yKey}
                name={s.name}
                stroke={PALETTE[i % PALETTE.length]}
                dot={false}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
