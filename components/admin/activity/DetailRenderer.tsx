import { ArrowRight } from "lucide-react";
import { parseAuditDetail } from "@/lib/admin/activity";
import { STATUS_META, type Status } from "@/lib/admin/labels";

// Server-safe. Formats the audit_log.detail JSONB into compact, human context for an activity row:
// a status transition arrow, a quoted reason, a free note, and changed-field pills.
export function ActivityDetail({ action, detail }: { action: string; detail: unknown }) {
  const d = parseAuditDetail(detail);
  const parts: React.ReactNode[] = [];

  if (d.from && action.startsWith("status:")) {
    const to = action.slice("status:".length) as Status;
    // Only show the arrow for a real transition — a republish/edit-in-place audits status:published
    // while already published (from === to), which rendered a confusing "Published → Published".
    if (d.from !== to) {
      parts.push(
        <span key="transition" className="inline-flex items-center gap-1 whitespace-nowrap">
          {STATUS_META[d.from as Status]?.label ?? d.from}
          <ArrowRight className="h-3 w-3 shrink-0" aria-hidden />
          {STATUS_META[to]?.label ?? to}
        </span>,
      );
    }
  }
  // Free text (reason/note) wraps with break-words — never `truncate` (white-space:nowrap), whose
  // min-content width can blow out the grid column and force horizontal page overflow on mobile.
  if (d.reason) parts.push(<span key="reason" className="min-w-0 break-words italic">&ldquo;{d.reason}&rdquo;</span>);
  if (d.note) parts.push(<span key="note" className="min-w-0 break-words">{d.note}</span>);
  if (d.changed?.length) {
    parts.push(
      <span key="changed" className="inline-flex flex-wrap items-center gap-1">
        {d.changed.map((f) => (
          <code key={f} className="rounded bg-muted px-1 py-px text-[10px] text-muted-foreground">
            {f}
          </code>
        ))}
      </span>,
    );
  }

  if (!parts.length) return null;
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      {parts}
    </span>
  );
}
