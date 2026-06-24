import { CopyX, FileWarning } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { TONES } from "@/lib/admin/labels";
import { parseAuditDetail } from "@/lib/admin/activity";
import { EmptyState } from "@/components/common/layout";

// Recent drops the worker API suppressed before any artifact existed (dedup hits + validation
// failures) — the payoff of the Slice-2 logging. Each row shows what was skipped and why. Server-safe.
export type DropRow = { id: string; action: string; detail: unknown; created_at: string };

const META: Record<string, { label: string; tone: "zinc" | "red"; icon: typeof CopyX }> = {
  dedup_suppressed: { label: "Duplicate", tone: "zinc", icon: CopyX },
  validation_rejected: { label: "Invalid", tone: "red", icon: FileWarning },
};

export function DropsPanel({ drops }: { drops: DropRow[] }) {
  if (drops.length === 0) {
    return <EmptyState>No dedup hits or validation failures recorded.</EmptyState>;
  }
  const chip = "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium";

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <ul className="divide-y divide-border">
        {drops.map((d) => {
          const meta = META[d.action] ?? META.validation_rejected;
          const Icon = meta.icon;
          const detail = parseAuditDetail(d.detail);
          return (
            <li key={d.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2.5">
              <span className={cn(chip, TONES[meta.tone])}>
                <Icon className="h-3 w-3 shrink-0" aria-hidden /> {meta.label}
              </span>
              {detail.source && (
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">{detail.source}</code>
              )}
              {detail.reason && (
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={detail.reason}>
                  {detail.reason}
                </span>
              )}
              <time
                dateTime={d.created_at}
                title={new Date(d.created_at).toLocaleString()}
                className="ml-auto whitespace-nowrap text-xs tabular-nums text-muted-foreground"
              >
                {timeAgo(d.created_at)}
              </time>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
