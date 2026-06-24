import { Activity, BarChart3, Clock, CopyX, FilePlus2, FileWarning, Flag, Library } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, SectionHeading } from "@/components/common/layout";
import { InsightStat } from "@/components/admin/insights/InsightStat";
import { ThroughputChart } from "@/components/admin/insights/ThroughputChart";
import { PipelineFunnel } from "@/components/admin/insights/PipelineFunnel";
import { DropsPanel, type DropRow } from "@/components/admin/insights/DropsPanel";
import { RecentRunsPanel, type RunSummary } from "@/components/admin/RecentRunsPanel";
import {
  formatDurationShort,
  formatPct,
  summarize,
  type InsightEvent,
  type InsightRun,
} from "@/lib/admin/insights";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 30; // headline + flow window
const CHART_DAYS = 14; // throughput columns
const DAY_MS = 24 * 60 * 60 * 1000;

export default async function InsightsPage() {
  const supabase = createClient();
  const now = Date.now();
  const cutoff = new Date(now - WINDOW_DAYS * DAY_MS).toISOString();

  const [{ data: events }, { data: runsRaw }, { data: drops }, { data: artifacts }] = await Promise.all([
    supabase
      .from("audit_log")
      .select("action, artifact_id, created_at")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase
      .from("routine_runs")
      .select("id, worker, status, session_url, started_at, artifact_id")
      .gte("started_at", cutoff)
      .order("started_at", { ascending: false })
      .limit(200),
    supabase
      .from("audit_log")
      .select("id, action, detail, created_at")
      .in("action", ["dedup_suppressed", "validation_rejected"])
      .order("created_at", { ascending: false })
      .limit(12),
    supabase.from("artifacts").select("status, deleted_at"),
  ]);

  const s = summarize(
    (events ?? []) as InsightEvent[],
    (runsRaw ?? []) as InsightRun[],
    CHART_DAYS,
    now,
  );
  const livePublished = (artifacts ?? []).filter((a) => a.status === "published" && !a.deleted_at).length;
  const runs = (runsRaw ?? []) as RunSummary[];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Insights"
        description="How the autonomous loop is performing — throughput, the drops the API suppresses, and run health. Windowed to the last 30 days."
      />

      {/* Headline metrics */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <InsightStat icon={Library} tone="emerald" value={livePublished} label="Published" hint="live in the library" />
        <InsightStat icon={FilePlus2} tone="sky" value={s.flow.drafted} label="Drafted" hint="last 30 days" />
        <InsightStat
          icon={Clock}
          tone="indigo"
          value={s.medianTimeToPublishMs === null ? "—" : formatDurationShort(s.medianTimeToPublishMs)}
          label="Time to publish"
          hint="draft → live (median)"
        />
        <InsightStat
          icon={CopyX}
          tone="zinc"
          value={s.flow.dedupSkipped}
          label="Duplicates skipped"
          hint={`${formatPct(s.dedupRate)} of attempts`}
        />
        <InsightStat
          icon={FileWarning}
          tone="red"
          value={s.flow.validationRejected}
          label="Validation fails"
          hint={`${formatPct(s.validationRate)} of attempts`}
        />
        <InsightStat
          icon={Activity}
          tone="brand"
          value={formatPct(s.runs.successRate)}
          label="Run success"
          hint={`${s.runs.total} runs · ${s.runs.failed} failed`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Throughput */}
        <section className="space-y-3">
          <SectionHeading className="flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> Throughput · last {CHART_DAYS} days
          </SectionHeading>
          <ThroughputChart data={s.throughput} />
        </section>

        {/* Pipeline flow */}
        <section className="space-y-3">
          <SectionHeading className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" /> Pipeline flow · 30 days
          </SectionHeading>
          <PipelineFunnel flow={s.flow} />
        </section>
      </div>

      {/* Drops — the Slice-2 payoff */}
      <section className="space-y-3">
        <SectionHeading className="flex items-center gap-1.5">
          <Flag className="h-3.5 w-3.5" /> Suppressed drafts
        </SectionHeading>
        <p className="-mt-1 text-xs text-muted-foreground">
          Drafts the governed API rejected before any artifact was created — duplicate/rejected sources and
          schema-validation failures.
        </p>
        <DropsPanel drops={(drops ?? []) as DropRow[]} />
      </section>

      {/* Recent runs with their Claude session links */}
      <RecentRunsPanel runs={runs} />
    </div>
  );
}
