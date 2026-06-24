import * as React from "react";
import { cn } from "@/lib/utils";

// One column of the queue board: a header (icon + title + count + optional action) and its cards,
// or a dashed empty placeholder. min-w-0 so a long card title can't blow out the grid track.
export function QueueLane({
  icon,
  title,
  hint,
  count,
  action,
  empty,
  children,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  count: number;
  action?: React.ReactNode;
  empty: string;
  children?: React.ReactNode;
  accent?: string;
}) {
  return (
    <section className="min-w-0 space-y-2.5">
      <div className="flex items-center gap-2">
        <span className={cn("inline-flex h-5 w-5 shrink-0 items-center justify-center", accent ?? "text-muted-foreground")}>
          {icon}
        </span>
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
          {count}
        </span>
        {action && <span className="ml-auto">{action}</span>}
      </div>
      {hint && <p className="-mt-1 text-xs text-muted-foreground">{hint}</p>}
      {count === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-2.5">{children}</div>
      )}
    </section>
  );
}
