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

type ChartStageT = Extract<ArtifactDocV1["stage"], { kind: "chart" }>;

const PALETTE = ["#4f46e5", "#22d3ee", "#f59e0b", "#10b981", "#f43f5e", "#a855f7"];

export function ChartStage({ stage }: { stage: ChartStageT }) {
  // Avoid SSR/responsive width warnings — render the chart after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const xKey = stage.axes.x;
  const yKey = stage.axes.y;

  if (!mounted) {
    return <div className="h-[340px] w-full animate-pulse rounded-lg bg-neutral-100" />;
  }

  return (
    <div className="h-[340px] w-full rounded-lg border border-neutral-200 bg-white p-3">
      <ResponsiveContainer width="100%" height="100%">
        {stage.chartType === "bar" ? (
          <BarChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {stage.series.map((s, i) => (
              <Bar key={s.name} data={s.data} dataKey={yKey} name={s.name} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </BarChart>
        ) : stage.chartType === "scatter" ? (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" dataKey={xKey} name={xKey} tick={{ fontSize: 11 }} />
            <YAxis type="number" dataKey={yKey} name={yKey} tick={{ fontSize: 11 }} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {stage.series.map((s, i) => (
              <Scatter key={s.name} data={s.data} name={s.name} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </ScatterChart>
        ) : (
          <LineChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
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
