import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { ACTION_LABELS, type DirectiveAction } from "@/lib/admin/labels";
import { cn, focusRing, timeAgo } from "@/lib/utils";
import { DirectiveDismissButton } from "./DirectiveDismissButton";

export type DirectiveItem = {
  id: string;
  note: string | null;
  action: DirectiveAction | null;
  publish_after: boolean;
  created_at: string;
  artifact: { id: string; title: string } | null;
};

// A card in the "Awaiting Editor" lane: an open directive the Editor will process on its next run —
// the human→AI handoff, made visible. Indigo-accented to read as a directed (AI-bound) item.
export function DirectiveCard({ item, now }: { item: DirectiveItem; now: number }) {
  if (!item.artifact) return null;
  const label = item.action ? ACTION_LABELS[item.action] : item.publish_after ? "Publish when done" : "Process";
  return (
    <div className="rounded-lg border border-indigo-200 bg-card p-3 dark:border-indigo-500/30">
      <Link
        href={`/admin/a/${item.artifact.id}`}
        className={cn("block break-words text-sm font-medium leading-snug hover:underline", focusRing)}
      >
        {item.artifact.title}
      </Link>
      <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
        <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Directed: {label}
        {item.action && item.publish_after ? " · publish after" : ""}
      </p>
      {item.note && <p className="mt-1 line-clamp-2 break-words text-xs italic text-muted-foreground">&ldquo;{item.note}&rdquo;</p>}
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3 shrink-0" aria-hidden /> Editor will process · {timeAgo(item.created_at, now)}
        </span>
        <DirectiveDismissButton commentId={item.id} artifactId={item.artifact.id} />
      </div>
    </div>
  );
}
