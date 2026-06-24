import { EmptyState } from "@/components/common/layout";
import type { DayBucket } from "@/lib/admin/insights";

// Server-rendered, dependency-free throughput chart: one stacked column per day (publishes on the
// bottom, drafts on top), scaled to the busiest day. CSS-only (no recharts/client JS), theme-aware
// via tokens, and dark-mode-safe. Reads left→right oldest→newest.
const MAX_BAR_PX = 104;

function dayLabel(date: string): string {
  // date is a UTC YYYY-MM-DD key; render as a short "Jun 24" using UTC to match the bucket.
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

export function ThroughputChart({ data }: { data: DayBucket[] }) {
  const max = Math.max(1, ...data.map((d) => d.drafts + d.publishes));
  const hasAny = data.some((d) => d.drafts + d.publishes > 0);
  const px = (n: number) => (n > 0 ? Math.max(3, Math.round((n / max) * MAX_BAR_PX)) : 0);

  if (!hasAny) {
    return <EmptyState>No drafts or publishes in this window yet.</EmptyState>;
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-end gap-1" style={{ height: MAX_BAR_PX }} role="img" aria-label="Daily drafts and publishes">
        {data.map((d) => {
          const total = d.drafts + d.publishes;
          return (
            <div key={d.date} className="flex h-full flex-1 flex-col justify-end" title={`${dayLabel(d.date)} — ${d.drafts} drafted, ${d.publishes} published`}>
              <div className="flex flex-col justify-end overflow-hidden rounded-sm" style={{ height: px(total) || 2 }}>
                <div className="w-full bg-brand" style={{ height: px(d.drafts) }} />
                <div className="w-full bg-emerald-500 dark:bg-emerald-400" style={{ height: px(d.publishes) }} />
              </div>
            </div>
          );
        })}
      </div>
      {/* sparse axis: first, middle, last */}
      <div className="mt-2 flex justify-between text-[10px] tabular-nums text-muted-foreground">
        <span>{dayLabel(data[0].date)}</span>
        {data.length > 2 && <span>{dayLabel(data[Math.floor(data.length / 2)].date)}</span>}
        <span>{dayLabel(data[data.length - 1].date)}</span>
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-brand" aria-hidden /> Drafted
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 dark:bg-emerald-400" aria-hidden /> Published
        </span>
      </div>
    </div>
  );
}
