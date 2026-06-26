import { EmptyState } from "@/components/common/layout";
import type { AudienceDayBucket } from "@/lib/admin/audience";

// Server-rendered, dependency-free audience chart: one column per day, scaled to the busiest day's
// views. Each column shows total views, with the unique-reader portion filled solid at the bottom
// (readers <= views always) and the remaining repeat views lighter on top. CSS-only (no recharts/
// client JS), theme-aware via tokens, dark-mode-safe. Reads left → right, oldest → newest.
const MAX_BAR_PX = 104;

function dayLabel(date: string): string {
  // date is a UTC YYYY-MM-DD key; render as a short "Jun 24" using UTC to match the bucket.
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

export function AudienceChart({ data }: { data: AudienceDayBucket[] }) {
  const max = Math.max(1, ...data.map((d) => d.views));
  const hasAny = data.some((d) => d.views > 0);
  const px = (n: number) => (n > 0 ? Math.max(3, Math.round((n / max) * MAX_BAR_PX)) : 0);

  if (!hasAny) {
    return <EmptyState>No views recorded in this window yet.</EmptyState>;
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div
        className="flex items-end gap-1"
        style={{ height: MAX_BAR_PX }}
        role="img"
        aria-label="Daily views and unique readers"
      >
        {data.map((d) => {
          const repeat = Math.max(0, d.views - d.readers);
          return (
            <div
              key={d.date}
              className="flex h-full flex-1 flex-col justify-end"
              title={`${dayLabel(d.date)} — ${d.views} view${d.views === 1 ? "" : "s"}, ${d.readers} reader${d.readers === 1 ? "" : "s"}`}
            >
              <div
                className="flex flex-col justify-end overflow-hidden rounded-sm"
                style={{ height: px(d.views) || 2 }}
              >
                <div className="w-full bg-brand/40" style={{ height: px(repeat) }} />
                <div className="w-full bg-brand" style={{ height: px(d.readers) }} />
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
          <span className="h-2.5 w-2.5 rounded-sm bg-brand" aria-hidden /> Unique readers
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-brand/40" aria-hidden /> Repeat views
        </span>
      </div>
    </div>
  );
}
