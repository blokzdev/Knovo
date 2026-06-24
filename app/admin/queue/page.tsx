import { Bot, Eye, Inbox, Rocket } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { splitArtifactsIntoLanes, isActionableDirective, LANE_META } from "@/lib/admin/queue";
import { QueueLane } from "@/components/admin/queue/QueueLane";
import { QueueCard, type QueueArtifact } from "@/components/admin/queue/QueueCard";
import { DirectiveCard, type DirectiveItem } from "@/components/admin/queue/DirectiveCard";
import { DispatchButton } from "@/components/admin/DispatchButton";
import { PageHeader } from "@/components/common/layout";

export const dynamic = "force-dynamic";

type DirectiveRow = DirectiveItem & { artifact: { id: string; title: string; deleted_at: string | null } | null };

export default async function QueueBoardPage() {
  const supabase = createClient();
  const now = Date.now();

  const [{ data: active }, { data: directiveRows }] = await Promise.all([
    // Display cap (not a governance boundary): the active, non-deleted pipeline is workflow-bounded and
    // won't approach 300 in practice; directives below are uncapped, matching the worker queue.
    supabase
      .from("artifacts")
      .select("id, slug, title, status, updated_at")
      .in("status", ["draft", "needs_review", "changes_requested", "approved"])
      .is("deleted_at", null)
      .order("updated_at", { ascending: true })
      .limit(300),
    supabase
      .from("comments")
      .select("id, note, action, publish_after, created_at, artifact:artifacts(id, title, status, deleted_at)")
      .eq("status", "open")
      .order("created_at", { ascending: true }),
  ]);

  const lanes = splitArtifactsIntoLanes((active ?? []) as QueueArtifact[]);
  // Only actionable directives on live artifacts enter the lane — kept in lockstep with the Editor's
  // /worker/queue via the shared isActionableDirective predicate.
  const directives = ((directiveRows ?? []) as unknown as DirectiveRow[]).filter(
    (d) => d.artifact && d.artifact.deleted_at === null && isActionableDirective(d),
  );
  // Artifacts that ALSO have an open directive → badge them "Awaiting Editor" in their lane, so a
  // directed item isn't silently both reviewable here and queued for the Editor there.
  const directedIds = new Set(directives.map((d) => d.artifact!.id));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Queue"
        description="The editorial pipeline, actionable end to end — triage Scout's drafts, review and direct, and watch what the Editor will process next. Published work lives in the Library."
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <QueueLane
          icon={<Inbox className="h-4 w-4" aria-hidden />}
          title={LANE_META.incoming.title}
          hint={LANE_META.incoming.hint}
          count={lanes.incoming.length}
          empty="No new drafts."
        >
          {lanes.incoming.map((a) => (
            <QueueCard key={a.id} artifact={a} now={now} directed={directedIds.has(a.id)} />
          ))}
        </QueueLane>

        <QueueLane
          icon={<Eye className="h-4 w-4" aria-hidden />}
          accent="text-amber-500 dark:text-amber-400"
          title={LANE_META.in_review.title}
          hint={LANE_META.in_review.hint}
          count={lanes.in_review.length}
          empty="Nothing in review."
        >
          {lanes.in_review.map((a) => (
            <QueueCard key={a.id} artifact={a} now={now} flagAge showStatus directed={directedIds.has(a.id)} />
          ))}
        </QueueLane>

        <QueueLane
          icon={<Bot className="h-4 w-4" aria-hidden />}
          accent="text-indigo-500 dark:text-indigo-400"
          title="Awaiting Editor"
          hint="the Editor's queue, made visible"
          count={directives.length}
          empty="No open directives."
          action={
            directives.length > 0 ? (
              <DispatchButton worker="editor" label="Process queue" variant="outline" className="h-7 px-2 text-xs" />
            ) : undefined
          }
        >
          {directives.map((d) => (
            <DirectiveCard key={d.id} item={d} now={now} />
          ))}
        </QueueLane>

        <QueueLane
          icon={<Rocket className="h-4 w-4" aria-hidden />}
          accent="text-emerald-500 dark:text-emerald-400"
          title={LANE_META.ready.title}
          hint={LANE_META.ready.hint}
          count={lanes.ready.length}
          empty="Nothing approved yet."
        >
          {lanes.ready.map((a) => (
            <QueueCard key={a.id} artifact={a} now={now} directed={directedIds.has(a.id)} />
          ))}
        </QueueLane>
      </div>
    </div>
  );
}
