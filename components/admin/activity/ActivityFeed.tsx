import { EmptyState } from "@/components/common/layout";
import { ActivityRow, type ActivityRowData } from "./ActivityRow";
import type { ProfileMap } from "./ActorBadge";

// A flat, divide-y list of activity rows with a consistent empty state. Run-grouping is composed at
// the page level (RunGroup wraps an ActivityFeed per run); this primitive renders the rows.
export function ActivityFeed({
  rows,
  profiles,
  currentUserId,
  hrefFor,
  emptyLabel = "No activity yet.",
  className,
}: {
  rows: ActivityRowData[];
  profiles?: ProfileMap;
  currentUserId?: string;
  hrefFor?: (row: ActivityRowData) => string | undefined;
  emptyLabel?: string;
  className?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card">
        <EmptyState>{emptyLabel}</EmptyState>
      </div>
    );
  }
  return (
    <div className={className ?? "overflow-hidden rounded-lg border border-border bg-card"}>
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li key={row.id}>
            <ActivityRow
              row={row}
              profiles={profiles}
              currentUserId={currentUserId}
              href={hrefFor?.(row)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
