import { createClient } from "@/lib/supabase/server";
import type { ProvenanceSource } from "@/components/renderer/ArtifactRenderer";

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

export type ArtifactCardData = {
  slug: string;
  title: string;
  summary: string | null;
  published_at: string | null;
};

export type PublishedArtifact = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  schema_version: number;
  doc: unknown;
  published_at: string | null;
  updated_at: string;
  series_id: string | null;
  sources: ProvenanceSource[];
};

export type SeriesWithArtifacts = {
  slug: string;
  title: string;
  summary: string | null;
  artifacts: ArtifactCardData[];
};

// Public read queries. Every query pins status='published' + deleted_at is null so the result is
// identical whether viewed by anon or an admin (whose RLS would otherwise see everything).
const PUBLISHED = { status: "published" as const };

export async function listPublished(limit = 60): Promise<ArtifactCardData[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("artifacts")
    .select("slug, title, summary, published_at")
    .match(PUBLISHED)
    .is("deleted_at", null)
    .order("published_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getPublishedArtifact(slug: string): Promise<PublishedArtifact | null> {
  const supabase = createClient();
  const { data: a } = await supabase
    .from("artifacts")
    .select("id, slug, title, summary, schema_version, doc, published_at, updated_at, series_id")
    .match(PUBLISHED)
    .is("deleted_at", null)
    .eq("slug", slug)
    .maybeSingle();
  if (!a) return null;

  const { data: srcRows } = await supabase
    .from("artifact_sources")
    .select("role, citation_text, source:sources(source_db, source_uid, url, title, retrieved_at)")
    .eq("artifact_id", a.id);

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

  return { ...a, sources };
}

export async function getSeriesWithArtifacts(slug: string): Promise<SeriesWithArtifacts | null> {
  const supabase = createClient();
  const { data: series } = await supabase
    .from("series")
    .select("id, slug, title, summary")
    .eq("slug", slug)
    .maybeSingle();
  if (!series) return null;

  const { data: arts } = await supabase
    .from("artifacts")
    .select("slug, title, summary, published_at, series_order")
    .match(PUBLISHED)
    .is("deleted_at", null)
    .eq("series_id", series.id)
    .order("series_order", { ascending: true, nullsFirst: false })
    .order("published_at", { ascending: true });

  return {
    slug: series.slug,
    title: series.title,
    summary: series.summary,
    artifacts: (arts ?? []).map(({ slug, title, summary, published_at }) => ({
      slug,
      title,
      summary,
      published_at,
    })),
  };
}
