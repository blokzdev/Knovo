import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/admin/guard";
import { resolveActorProfiles } from "@/lib/admin/profiles";
import { ArtifactRenderer, type ProvenanceSource } from "@/components/renderer/ArtifactRenderer";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusControls } from "@/components/admin/StatusControls";
import { DirectiveComposer } from "@/components/admin/DirectiveComposer";
import { DirectiveList, type DirectiveRow } from "@/components/admin/DirectiveList";
import { RevisionList, type RevisionRow } from "@/components/admin/RevisionList";
import { DispatchEditorButton } from "@/components/admin/DispatchEditorButton";
import { ActivityFeed } from "@/components/admin/activity/ActivityFeed";
import type { ActivityRowData } from "@/components/admin/activity/ActivityRow";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

type SourceJoin = {
  role: "primary" | "supporting";
  citation_text: string | null;
  source: { source_db: string; source_uid: string; url: string | null; title: string | null; retrieved_at: string | null } | null;
};

export default async function ArtifactDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const ctx = await getAdminContext();
  const currentUserId = ctx.ok ? ctx.user.id : undefined;

  const { data: artifact } = await supabase
    .from("artifacts")
    .select("id, slug, title, summary, status, schema_version, doc, created_at, updated_at, published_at, rejected_reason, deleted_at, last_worker")
    .eq("id", params.id)
    .maybeSingle();
  if (!artifact) notFound();

  const [{ data: srcRows }, { data: commentRows }, { data: revisions }, { data: audit }] = await Promise.all([
    supabase
      .from("artifact_sources")
      .select("role, citation_text, source:sources(source_db, source_uid, url, title, retrieved_at)")
      .eq("artifact_id", artifact.id),
    supabase
      .from("comments")
      .select("id, note, action, publish_after, status, created_at, addressed_by, options")
      .eq("artifact_id", artifact.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("revisions")
      .select("id, doc, note, created_by, created_at, schema_version")
      .eq("artifact_id", artifact.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("audit_log")
      .select("id, actor, action, created_at, detail")
      .eq("artifact_id", artifact.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const sources: ProvenanceSource[] = ((srcRows ?? []) as unknown as SourceJoin[])
    .filter((r) => r.source)
    .map((r) => ({
      source_db: r.source!.source_db,
      source_uid: r.source!.source_uid,
      url: r.source!.url,
      title: r.source!.title,
      citation_text: r.citation_text,
      role: r.role,
      retrieved_at: r.source!.retrieved_at,
    }));
  const directives = (commentRows ?? []) as unknown as DirectiveRow[];
  const revisionRows = (revisions ?? []) as unknown as RevisionRow[];
  const auditRows = (audit ?? []) as ActivityRowData[];
  const openCount = directives.filter((d) => d.status === "open").length;

  const profiles = await resolveActorProfiles(supabase, [
    ...auditRows.map((a) => a.actor),
    ...revisionRows.map((r) => r.created_by),
    ...directives.flatMap((d) => [d.options?.raised_by ?? null, d.addressed_by]),
  ]);

  const tabTrigger = "min-w-0 flex-1 truncate text-xs sm:text-sm";

  return (
    <div className="space-y-6">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Queue
      </Link>

      {/* Header + toolbar */}
      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={artifact.status} />
              {artifact.deleted_at && <span className="text-xs font-medium text-destructive">trashed</span>}
              <code className="text-xs text-muted-foreground">/a/{artifact.slug}</code>
            </div>
            <h1 className="mt-2 text-xl font-semibold tracking-tight">{artifact.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              schema v{artifact.schema_version} · updated {new Date(artifact.updated_at).toLocaleString()}
              {artifact.last_worker ? ` · ${artifact.last_worker}` : ""}
            </p>
          </div>
          <DispatchEditorButton artifactId={artifact.id} slug={artifact.slug} />
        </div>
        <StatusControls artifactId={artifact.id} status={artifact.status} deleted={Boolean(artifact.deleted_at)} />
        {artifact.rejected_reason && (
          <p className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            Rejected: {artifact.rejected_reason}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Preview — min-w-0 so a wide stage can't blow out the grid track (and force page overflow). */}
        <div className="min-w-0 lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <ArtifactRenderer doc={artifact.doc} schemaVersion={artifact.schema_version} sources={sources} />
          </div>
        </div>

        {/* Direct + history — min-w-0 so long audit notes/reasons wrap instead of widening the column. */}
        <div className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Direct</h2>
            <DirectiveComposer artifactId={artifact.id} />
          </div>

          <Tabs defaultValue="directives">
            <TabsList className="w-full">
              <TabsTrigger value="directives" className={tabTrigger}>
                Directives{openCount > 0 ? ` (${openCount})` : ""}
              </TabsTrigger>
              <TabsTrigger value="revisions" className={tabTrigger}>
                Revisions{revisionRows.length > 0 ? ` (${revisionRows.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="audit" className={tabTrigger}>
                Audit
              </TabsTrigger>
            </TabsList>

            <TabsContent value="directives">
              <DirectiveList
                artifactId={artifact.id}
                directives={directives}
                profiles={profiles}
                currentUserId={currentUserId}
              />
            </TabsContent>

            <TabsContent value="revisions">
              <RevisionList
                artifactId={artifact.id}
                currentDoc={artifact.doc}
                revisions={revisionRows}
                profiles={profiles}
                currentUserId={currentUserId}
              />
            </TabsContent>

            <TabsContent value="audit">
              <ActivityFeed
                rows={auditRows}
                profiles={profiles}
                currentUserId={currentUserId}
                emptyLabel="No audit entries."
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
