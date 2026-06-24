import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Settings2, Wrench } from "lucide-react";
import { TONES, WORKER_META, type WorkerId } from "@/lib/admin/labels";
import {
  statusLabel,
  settingsHref,
  WORKER_STATE_META,
  type WorkerStateIcon,
  type WorkerStatus,
} from "@/lib/admin/worker-state";
import { cn, focusRing, timeAgo } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { WORKER_ICONS } from "./activity/icons";
import { DispatchButton } from "./DispatchButton";
import { WorkerCardMenu } from "./WorkerCardMenu";

const PILL_ICON: Record<WorkerStateIcon, typeof CheckCircle2> = {
  ready: CheckCircle2,
  setup: Settings2,
  issue: AlertTriangle,
};

// One state-aware dispatch card. The status (lib/admin/worker-state) drives the pill, the detail
// line, and — crucially — the action: a not-configured worker offers "Set up →" (deep-linked to its
// settings tab) instead of a dead dispatch button that fires straight into an error toast.
export function WorkerCard({ worker, status }: { worker: WorkerId; status: WorkerStatus }) {
  const meta = WORKER_META[worker];
  const Icon = WORKER_ICONS[worker];
  const stateMeta = WORKER_STATE_META[status.state];
  const PillIcon = PILL_ICON[stateMeta.icon];

  return (
    <Card>
      <CardContent className="flex h-full flex-col gap-2 p-4">
        <div className="flex items-center gap-2">
          <span className={cn("inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border", TONES[meta.tone])}>
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold">{meta.label}</span>
          <span
            aria-label={`${meta.label} status: ${statusLabel(status)}`}
            className={cn(
              "ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
              TONES[stateMeta.tone],
            )}
          >
            <PillIcon className="h-3 w-3 shrink-0" aria-hidden />
            {statusLabel(status)}
          </span>
        </div>

        <p className="text-xs text-muted-foreground">{meta.blurb}</p>

        <p className="text-xs">
          {status.state === "issue" ? (
            <span className="line-clamp-2 align-middle text-red-700 dark:text-red-300" title={status.reason ?? undefined}>
              {status.reason}
            </span>
          ) : status.state === "setup" ? (
            <span className="text-muted-foreground/80">Trigger not configured</span>
          ) : status.active && status.lastRunAt ? (
            <span className="text-muted-foreground">Last run {timeAgo(status.lastRunAt)}</span>
          ) : (
            <span className="text-muted-foreground/80">Configured · not run yet</span>
          )}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          {status.canDispatch ? (
            <DispatchButton worker={worker} className="min-w-0 flex-1" />
          ) : (
            // Not dispatchable (not configured, or an invalid trigger that can never succeed): offer
            // the fix instead of a dead button that fires straight into an error toast.
            <Link href={settingsHref(worker)} className={cn(buttonVariants({ size: "sm" }), "min-w-0 flex-1", focusRing)}>
              <Settings2 className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {status.state === "setup" ? `Set up ${meta.label}` : `Fix ${meta.label}`}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          )}
          {/* A retryable issue (last dispatch failed but the config looks valid): keep retry, add a fix shortcut. */}
          {status.state === "issue" && status.canDispatch && (
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link href={settingsHref(worker)} aria-label={`Fix ${meta.label} in settings`}>
                <Wrench className="h-4 w-4" /> Fix
              </Link>
            </Button>
          )}
          <WorkerCardMenu worker={worker} sessionUrl={status.sessionUrl} />
        </div>
      </CardContent>
    </Card>
  );
}
