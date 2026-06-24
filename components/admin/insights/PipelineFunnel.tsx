import { EmptyState } from "@/components/common/layout";
import type { FlowCounts } from "@/lib/admin/insights";

// The draft → review → publish flow over the window, as proportional horizontal bars (each scaled to
// the busiest stage). Rejected / archived / flagged are summarized as a footer line. Server-safe.
const STAGES = [
  { key: "drafted", label: "Drafted", fill: "bg-foreground/30" },
  { key: "review", label: "Sent for review", fill: "bg-amber-400 dark:bg-amber-500" },
  { key: "published", label: "Published", fill: "bg-emerald-500 dark:bg-emerald-400" },
] as const;

export function PipelineFunnel({ flow }: { flow: FlowCounts }) {
  const max = Math.max(1, flow.drafted, flow.review, flow.published);
  const anyFlow = flow.drafted + flow.review + flow.published > 0;

  if (!anyFlow) {
    return <EmptyState>No pipeline activity in this window yet.</EmptyState>;
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <ul className="space-y-2.5">
        {STAGES.map((s) => {
          const value = flow[s.key];
          const pct = Math.round((value / max) * 100);
          return (
            <li key={s.key} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-xs text-muted-foreground">{s.label}</span>
              <span className="relative h-5 flex-1 overflow-hidden rounded bg-muted">
                <span
                  className={`absolute inset-y-0 left-0 rounded ${s.fill}`}
                  style={{ width: `${value === 0 ? 0 : Math.max(4, pct)}%` }}
                />
              </span>
              <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums">{value}</span>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-border pt-2.5 text-xs text-muted-foreground">
        Also in window: <span className="font-medium text-foreground tabular-nums">{flow.rejected}</span> rejected ·{" "}
        <span className="font-medium text-foreground tabular-nums">{flow.archived}</span> archived ·{" "}
        <span className="font-medium text-foreground tabular-nums">{flow.flags}</span> flagged
      </p>
    </div>
  );
}
