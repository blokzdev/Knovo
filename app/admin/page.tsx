import Link from "next/link";
import { AlertTriangle, Clock, Flag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/admin/guard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { WorkersPanel } from "@/components/admin/WorkersPanel";
import { HealthBanner } from "@/components/admin/HealthBanner";
import { ActivityRow } from "@/components/admin/activity/ActivityRow";
import { RunGroup } from "@/components/admin/activity/RunGroup";
import { groupActivityIntoRuns, type ActivityEvent, type RunRow } from "@/lib/admin/activity";
import { computeHealth, isOverdue, waitDays } from "@/lib/admin/health";
import { resolveActorProfiles } from "@/lib/admin/profiles";
import { SEVERITY_CLS, STATUS_META, STATUS_ORDER, TONES, type Status } from "@/lib/admin/labels";
import { EmptyState, PageHeader, SectionHeading, StatCard } from "@/components/common/layout";
import { cn, focusRing, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

const HEALTH_WINDOW_DAYS = 14;

type FlagRow = {
  id: string;
  note: string | null;
  created_at: string;
  options: { raised_by?: string; severity?: string } | null;
  artifact: { id: string; slug: string; title: string } | null;
};

export default async function QueuePage() {
  const supabase = createClient();
  const ctx = await getAdminContext();
  const currentUserId = ctx.ok ? ctx.user.id : undefined;
  const now = Date.now();
  const healthCutoff = new Date(now - HEALTH_WINDOW_DAYS * 86_400_000).toISOString();

  const [{ data: all }, { data: queue }, { data: flagsRaw }, { data: activity }, { data: runs }, { data: winRows }] =
    await Promise.all([
      supabase.from("artifacts").select("status, deleted_at"),
      supabase
        .from("artifacts")
        .select("id, slug, title, status, updated_at")
        .in("status", ["needs_review", "changes_requested"])
        .is("deleted_at", null)
        .order("updated_at", { ascending: true }),
      supabase
        .from("comments")
        .select("id, note, created_at, options, artifact:artifacts(id, slug, title)")
        .eq("status", "open")
        .is("action", null)
        .eq("publish_after", false)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("audit_log")
        .select("id, actor, action, created_at, artifact_id, detail, run_id")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("routine_runs")
        .select("id, worker, status, session_url, started_at")
        .order("started_at", { ascending: false })
        .limit(20),
      supabase
        .from("audit_log")
        .select("action")
        .gte("created_at", healthCutoff)
        .in("action", ["create_draft", "dedup_suppressed", "validation_rejected"]),
    ]);

  const counts = new Map<Status, number>();
  for (const r of all ?? []) {
    if (r.deleted_at) continue;
    counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
  }
  const flags = ((flagsRaw ?? []) as unknown as FlagRow[]).filter((f) => f.artifact);
  const queueItems = queue ?? [];

  // Health: latest run per worker that failed + windowed drop counts → the attention banner.
  const latestRunStatus = new Map<string, string>();
  for (const r of runs ?? []) if (!latestRunStatus.has(r.worker)) latestRunStatus.set(r.worker, r.status);
  const failedWorkers = [...latestRunStatus].filter(([, s]) => s === "failed").map(([w]) => w);
  const win = (winRows ?? []) as { action: string }[];
  const dedupSkipped = win.filter((r) => r.action === "dedup_suppressed").length;
  const validationRejected = win.filter((r) => r.action === "validation_rejected").length;
  const createAttempts = win.length; // create_draft + dedup_suppressed + validation_rejected
  const alerts = computeHealth({
    now,
    reviewItems: queueItems.map((q) => ({ updated_at: q.updated_at })),
    failedWorkers,
    createAttempts,
    dedupSkipped,
    validationRejected,
  });

  const groups = groupActivityIntoRuns(
    (activity ?? []) as ActivityEvent[],
    (runs ?? []) as RunRow[],
  );
  const profiles = await resolveActorProfiles(supabase, (activity ?? []).map((a) => a.actor));
  const hrefFor = (r: ActivityEvent) => (r.artifact_id ? `/admin/a/${r.artifact_id}` : undefined);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Control HUD"
        description="Direct the autonomous editorial team — review, comment, and publish."
      />

      {/* Needs-attention banner — the glance for an unattended loop */}
      <HealthBanner alerts={alerts} />

      {/* Status summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {STATUS_ORDER.map((s) => (
          <StatCard
            key={s}
            href={`/admin/library?status=${s}`}
            value={counts.get(s) ?? 0}
            label={STATUS_META[s].label}
          />
        ))}
      </div>

      {/* Workers */}
      <section className="space-y-3">
        <SectionHeading>Dispatch workers</SectionHeading>
        <WorkersPanel />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Action queue */}
        <section className="space-y-3">
          <SectionHeading>Needs your attention</SectionHeading>
          {queueItems.length === 0 ? (
            <EmptyState>Nothing waiting for review.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {queueItems.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/admin/a/${a.id}`}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-foreground/20",
                      focusRing,
                    )}
                  >
                    <StatusBadge status={a.status} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.title}</span>
                    <span
                      title={`Waiting since ${new Date(a.updated_at).toLocaleString()}`}
                      className={cn(
                        "shrink-0 whitespace-nowrap text-xs tabular-nums",
                        isOverdue(a.updated_at, now) ? "font-medium text-amber-700 dark:text-amber-400" : "text-muted-foreground",
                      )}
                    >
                      {timeAgo(a.updated_at, now)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Open flags */}
        <section className="space-y-3">
          <SectionHeading className="flex items-center gap-1.5">
            <Flag className="h-3.5 w-3.5" /> Open flags
          </SectionHeading>
          {flags.length === 0 ? (
            <EmptyState>No open flags.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {flags.map((f) => (
                <li key={f.id}>
                  <Link
                    href={`/admin/a/${f.artifact!.id}`}
                    className={cn(
                      "block rounded-lg border border-border bg-card p-3 transition-colors hover:border-foreground/20",
                      focusRing,
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {f.options?.severity && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium",
                            SEVERITY_CLS[f.options.severity] ?? SEVERITY_CLS.info,
                          )}
                        >
                          <AlertTriangle className="h-3 w-3" aria-hidden /> {f.options.severity}
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{f.artifact!.title}</span>
                    </div>
                    {f.note && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{f.note}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Recent activity — run-grouped */}
      <section className="space-y-3">
        <SectionHeading className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> Recent activity
        </SectionHeading>
        {groups.length === 0 ? (
          <div className="rounded-lg border border-border bg-card">
            <p className="p-6 text-center text-sm text-muted-foreground">No activity yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((g, gi) =>
              g.run ? (
                <RunGroup key={g.run.id} run={g.run} count={g.rows.length}>
                  {g.rows.map((r) => (
                    <li key={r.id}>
                      <ActivityRow row={r} profiles={profiles} currentUserId={currentUserId} href={hrefFor(r)} />
                    </li>
                  ))}
                </RunGroup>
              ) : (
                <div key={`loose-${gi}`} className="overflow-hidden rounded-lg border border-border bg-card">
                  <ul className="divide-y divide-border">
                    {g.rows.map((r) => (
                      <li key={r.id}>
                        <ActivityRow row={r} profiles={profiles} currentUserId={currentUserId} href={hrefFor(r)} />
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}
