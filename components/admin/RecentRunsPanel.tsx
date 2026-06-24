import Link from "next/link";
import { ExternalLink, FileText, Play } from "lucide-react";
import { cn, focusRing, timeAgo } from "@/lib/utils";
import { RUN_STATUS_META, TONES, WORKER_META, type WorkerId } from "@/lib/admin/labels";
import { SectionHeading } from "@/components/common/layout";
import { WORKER_ICONS } from "./activity/icons";

export type RunSummary = {
  id: string;
  worker: string;
  status: string;
  session_url: string | null;
  started_at: string;
  artifact_id: string | null;
};

// Recent dashboard-dispatched runs with their Claude session deep links. Server-safe; mirrors the
// run headers in the HUD feed so the operator can reopen any session from settings too.
export function RecentRunsPanel({ runs }: { runs: RunSummary[] }) {
  if (runs.length === 0) return null;
  const chip = "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium";

  return (
    <section className="space-y-3">
      <SectionHeading className="flex items-center gap-1.5">
        <Play className="h-3.5 w-3.5" /> Recent runs
      </SectionHeading>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <ul className="divide-y divide-border">
          {runs.map((r) => {
            const worker = WORKER_META[r.worker as WorkerId];
            const Icon = WORKER_ICONS[r.worker as WorkerId] ?? Play;
            const status = RUN_STATUS_META[r.status] ?? RUN_STATUS_META.dispatched;
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-4 py-2.5">
                <span className={cn(chip, TONES[worker?.tone ?? "zinc"])}>
                  <Icon className="h-3 w-3 shrink-0" aria-hidden /> {worker?.label ?? r.worker}
                </span>
                <span className={cn(chip, TONES[status.tone])}>{status.label}</span>
                {r.session_url && (
                  <a
                    href={r.session_url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open the Claude session (opens in a new tab)"
                    className={cn("inline-flex items-center gap-1 rounded-md text-xs font-medium text-brand hover:underline", focusRing)}
                  >
                    Open session <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                )}
                {r.artifact_id && (
                  <Link
                    href={`/admin/a/${r.artifact_id}`}
                    className={cn("inline-flex items-center gap-1 rounded-md text-xs text-muted-foreground hover:text-foreground", focusRing)}
                  >
                    <FileText className="h-3 w-3" aria-hidden /> artifact
                  </Link>
                )}
                <time
                  dateTime={r.started_at}
                  aria-label={`Started ${new Date(r.started_at).toLocaleString()}`}
                  title={new Date(r.started_at).toLocaleString()}
                  className="ml-auto whitespace-nowrap text-xs tabular-nums text-muted-foreground"
                >
                  {timeAgo(r.started_at)}
                </time>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
