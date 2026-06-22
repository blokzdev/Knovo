import { createClient } from "@/lib/supabase/server";
import type { ArtifactCardData } from "@/lib/artifacts/public";

export type ReaderComment = {
  id: string;
  body: string;
  created_at: string;
  edited: boolean;
  author_id: string;
  author: { display_name: string | null; avatar_url: string | null } | null;
};

// Visible comments on an artifact. The author's public display (name + avatar) is denormalized
// onto the row at insert time (0006), so this is a single-table read — no profiles join, no
// SECURITY DEFINER view. RLS already filters to status='visible' on published artifacts for
// non-admins.
export async function listComments(artifactId: string): Promise<ReaderComment[]> {
  const supabase = createClient();
  const { data: rows } = await supabase
    .from("reader_comments")
    .select("id, body, created_at, edited, author_id, author_name, author_avatar")
    .eq("artifact_id", artifactId)
    .order("created_at", { ascending: true });

  return (rows ?? []).map((c) => ({
    id: c.id,
    body: c.body,
    created_at: c.created_at,
    edited: c.edited,
    author_id: c.author_id,
    author: { display_name: c.author_name, avatar_url: c.author_avatar },
  }));
}

export async function getBookmarked(artifactId: string): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("bookmarks")
    .select("artifact_id")
    .eq("user_id", user.id)
    .eq("artifact_id", artifactId)
    .maybeSingle();
  return !!data;
}

export async function getSubscribed(): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("scope", "all")
    .maybeSingle();
  return !!data;
}

export async function listBookmarkedArtifacts(): Promise<ArtifactCardData[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows } = await supabase
    .from("bookmarks")
    .select("created_at, artifact:artifacts(slug, title, summary, published_at, status, deleted_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  type Row = {
    artifact: {
      slug: string;
      title: string;
      summary: string | null;
      published_at: string | null;
      status: string;
      deleted_at: string | null;
    } | null;
  };

  return ((rows ?? []) as unknown as Row[])
    .map((r) => r.artifact)
    .filter((a): a is NonNullable<Row["artifact"]> => !!a && a.status === "published" && !a.deleted_at)
    .map(({ slug, title, summary, published_at }) => ({ slug, title, summary, published_at }));
}
