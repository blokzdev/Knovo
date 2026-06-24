import Link from "next/link";
import { AlertTriangle, Bot } from "lucide-react";
import { isOverdue } from "@/lib/admin/health";
import { cn, focusRing, timeAgo } from "@/lib/utils";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { Status } from "@/lib/admin/labels";
import { QueueCardActions } from "./QueueCardActions";

export type QueueArtifact = {
  id: string;
  slug: string;
  title: string;
  status: Status;
  updated_at: string;
};

// One artifact in a queue lane: title links to the full review, an age stamp (amber + an icon/sr-only
// cue when a review is overdue — never color alone), an optional status badge (so the merged In-review
// lane distinguishes needs_review from changes_requested), an "Awaiting Editor" marker when the item
// also has an open directive (so it's clear the Editor will act on it), and the inline governed actions.
export function QueueCard({
  artifact,
  now,
  flagAge,
  showStatus,
  directed,
}: {
  artifact: QueueArtifact;
  now: number;
  flagAge?: boolean;
  showStatus?: boolean;
  directed?: boolean;
}) {
  const overdue = flagAge && isOverdue(artifact.updated_at, now);
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start gap-2">
        <Link
          href={`/admin/a/${artifact.id}`}
          className={cn("min-w-0 flex-1 break-words text-sm font-medium leading-snug hover:underline", focusRing)}
        >
          {artifact.title}
        </Link>
        <span
          title={overdue ? `Overdue — updated ${new Date(artifact.updated_at).toLocaleString()}` : `Updated ${new Date(artifact.updated_at).toLocaleString()}`}
          className={cn(
            "inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs tabular-nums",
            overdue ? "font-medium text-amber-700 dark:text-amber-400" : "text-muted-foreground",
          )}
        >
          {overdue && <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />}
          {timeAgo(artifact.updated_at, now)}
          {overdue && <span className="sr-only">overdue for review</span>}
        </span>
      </div>

      {(showStatus || directed) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {showStatus && <StatusBadge status={artifact.status} />}
          {directed && (
            <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200 px-1.5 py-0.5 text-[11px] font-medium text-indigo-600 dark:border-indigo-500/30 dark:text-indigo-400">
              <Bot className="h-3 w-3 shrink-0" aria-hidden /> Awaiting Editor
            </span>
          )}
        </div>
      )}

      <div className="mt-2.5">
        <QueueCardActions artifactId={artifact.id} status={artifact.status} title={artifact.title} />
      </div>
    </div>
  );
}
