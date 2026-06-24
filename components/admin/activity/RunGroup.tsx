"use client";

import * as React from "react";
import { ChevronDown, ExternalLink, Play } from "lucide-react";
import { cn, focusRing, timeAgo } from "@/lib/utils";
import { RUN_STATUS_META, TONES, WORKER_META, type WorkerId } from "@/lib/admin/labels";
import { WORKER_ICONS } from "./icons";

export type RunHeader = {
  id: string;
  worker: string;
  status: string;
  session_url: string | null;
  started_at: string;
};

// A collapsible group: a routine run (which worker, status, "Open session" deep link, when) over the
// activity rows correlated to it. Header reflows on narrow screens so nothing overlaps.
export function RunGroup({
  run,
  count,
  defaultOpen = true,
  children,
}: {
  run: RunHeader;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const worker = WORKER_META[run.worker as WorkerId];
  const Icon = WORKER_ICONS[run.worker as WorkerId] ?? Play;
  const status = RUN_STATUS_META[run.status] ?? RUN_STATUS_META.dispatched;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-border bg-muted/30 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={`${open ? "Collapse" : "Expand"} ${worker?.label ?? run.worker} run`}
          className={cn("-ml-2 flex min-h-10 items-center gap-1.5 rounded-md px-2 text-sm font-medium", focusRing)}
        >
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 motion-safe:transition-transform", !open && "-rotate-90")}
            aria-hidden
          />
          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{worker?.label ?? run.worker} run</span>
        </button>
        <span className={cn("rounded-md border px-1.5 py-0.5 text-xs font-medium", TONES[status.tone])}>
          {status.label}
        </span>
        <span className="text-xs text-muted-foreground">
          {count} {count === 1 ? "action" : "actions"}
        </span>
        {run.session_url && (
          <a
            href={run.session_url}
            target="_blank"
            rel="noreferrer"
            aria-label="Open the Claude session (opens in a new tab)"
            className={cn(
              "inline-flex min-h-10 items-center gap-1 rounded-md text-xs font-medium text-brand hover:underline",
              focusRing,
            )}
          >
            Open session <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        )}
        <time
          dateTime={run.started_at}
          aria-label={`Started ${new Date(run.started_at).toLocaleString()}`}
          title={new Date(run.started_at).toLocaleString()}
          className="ml-auto whitespace-nowrap text-xs tabular-nums text-muted-foreground"
        >
          {timeAgo(run.started_at)}
        </time>
      </div>
      {open && <ul className="divide-y divide-border">{children}</ul>}
    </div>
  );
}
