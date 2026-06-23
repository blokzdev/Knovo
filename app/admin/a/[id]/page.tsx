import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ArtifactRenderer, type ProvenanceSource } from "@/components/renderer/ArtifactRenderer";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusControls } from "@/components/admin/StatusControls";
import { DirectiveComposer } from "@/components/admin/DirectiveComposer";
import { DirectiveList, type DirectiveRow } from "@/components/admin/DirectiveList";
import { DispatchEditorButton } from "@/components/admin/DispatchEditorButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

type SourceJoin = {
  role: "primary" | "supporting";
  citation_text: string | null;
  source: {
    source_db: string;
    source_uid: string;
    url: string | null;
    title: string | null;
    retrieved_at: string | null;
  } | null;
};

export default async function ArtifactDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: artifact } = await supabase
    .from("artifacts")
    .select(
      "id, slug, title, summary, status, schema_version, doc, created_at, updated_at, published_at, rejected_reason, deleted_at, last_worker",
    )
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
      .select("id, created_at, created_by, note, schema_version")
      .eq("artifact_id", artifact.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("audit_log")
      .select("actor, action, created_at, detail")
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
  const openCount = directives.filter((d) => d.status === "open").length;

  return (
    <div className="space-y-6">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Queue
      </Link>

      {/* Header + toolbar */}
      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
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
          <p className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
            Rejected: {artifact.rejected_reason}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Preview */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <ArtifactRenderer doc={artifact.doc} schemaVersion={artifact.schema_version} sources={sources} />
          </div>
        </div>

        {/* Direct + history */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Direct</h2>
            <DirectiveComposer artifactId={artifact.id} />
          </div>

          <Tabs defaultValue="directives">
            <TabsList className="w-full">
              <TabsTrigger value="directives" className="flex-1">
                Directives{openCount > 0 ? ` (${openCount})` : ""}
              </TabsTrigger>
              <TabsTrigger value="revisions" className="flex-1">
                Revisions
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex-1">
                Audit
              </TabsTrigger>
            </TabsList>

            <TabsContent value="directives">
              <DirectiveList artifactId={artifact.id} directives={directives} />
            </TabsContent>

            <TabsContent value="revisions">
              {(revisions ?? []).length === 0 ? (
                <p className="px-1 py-6 text-center text-sm text-muted-foreground">No revisions yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {(revisions ?? []).map((r) => (
                    <li key={r.id} className="rounded-md border border-border bg-card px-3 py-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-muted-foreground">{r.created_by ?? "—"}</span>
                        <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                      </div>
                      {r.note && <p className="mt-1 text-muted-foreground">{r.note}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="audit">
              {(audit ?? []).length === 0 ? (
                <p className="px-1 py-6 text-center text-sm text-muted-foreground">No audit entries.</p>
              ) : (
                <ul className="space-y-1">
                  {(audit ?? []).map((a, i) => (
                    <li key={i} className="flex items-center gap-2 px-1 py-1.5 text-xs">
                      <span className="font-mono text-muted-foreground">{a.actor}</span>
                      <span className="text-foreground">{a.action}</span>
                      <span className="ml-auto text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
