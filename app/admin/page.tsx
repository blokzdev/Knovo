import Link from "next/link";
import { Flag, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { WorkersPanel } from "@/components/admin/WorkersPanel";
import { STATUS_ORDER, STATUS_META, SEVERITY_CLS, type Status } from "@/lib/admin/labels";
import { EmptyState, PageHeader, SectionHeading, StatCard } from "@/components/common/layout";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type FlagRow = {
  id: string;
  note: string | null;
  created_at: string;
  options: { raised_by?: string; severity?: string } | null;
  artifact: { id: string; slug: string; title: string } | null;
};

export default async function QueuePage() {
  const supabase = createClient();

  const [{ data: all }, { data: queue }, { data: flagsRaw }, { data: activity }] = await Promise.all([
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
      .select("actor, action, created_at, artifact_id")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const counts = new Map<Status, number>();
  for (const r of all ?? []) {
    if (r.deleted_at) continue;
    counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
  }
  const flags = ((flagsRaw ?? []) as unknown as FlagRow[]).filter((f) => f.artifact);
  const queueItems = queue ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Control HUD"
        description="Direct the autonomous editorial team — review, comment, and publish."
      />

      {/* Status summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
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
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-foreground/20"
                  >
                    <StatusBadge status={a.status} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.title}</span>
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
                    className="block rounded-lg border border-border bg-card p-3 transition-colors hover:border-foreground/20"
                  >
                    <div className="flex items-center gap-2">
                      {f.options?.severity && (
                        <span
                          className={cn(
                            "rounded-md border px-1.5 py-0.5 text-xs font-medium",
                            SEVERITY_CLS[f.options.severity] ?? SEVERITY_CLS.info,
                          )}
                        >
                          {f.options.severity}
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

      {/* Recent activity */}
      <section className="space-y-3">
        <SectionHeading className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> Recent activity
        </SectionHeading>
        <div className="rounded-lg border border-border bg-card">
          {(activity ?? []).length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {(activity ?? []).map((a, i) => (
                <li key={i} className="flex items-center gap-3 px-4 py-2 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{a.actor}</span>
                  <span className="text-foreground">{a.action}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
