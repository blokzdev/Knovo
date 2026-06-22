"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

const MAX_BODY = 5000;

// Reader actions run through the cookie (anon-key) client, so RLS — not this code — is the real
// boundary: ownership (`author_id`/`user_id = auth.uid()`) and "only on published artifacts" are
// enforced by the 0005 policies. The checks here are for friendly errors, not security.
async function currentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function toggleBookmark(input: {
  artifactId: string;
  slug: string;
}): Promise<{ ok: true; bookmarked: boolean } | { ok: false; error: string }> {
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "Sign in to save articles." };

  const { data: existing } = await supabase
    .from("bookmarks")
    .select("artifact_id")
    .eq("user_id", user.id)
    .eq("artifact_id", input.artifactId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("artifact_id", input.artifactId);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/a/${input.slug}`);
    revalidatePath("/account/bookmarks");
    return { ok: true, bookmarked: false };
  }

  const { error } = await supabase
    .from("bookmarks")
    .insert({ user_id: user.id, artifact_id: input.artifactId });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/a/${input.slug}`);
  revalidatePath("/account/bookmarks");
  return { ok: true, bookmarked: true };
}

export async function postComment(input: {
  artifactId: string;
  slug: string;
  body: string;
}): Promise<Result> {
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "Sign in to comment." };
  const body = input.body.trim();
  if (!body) return { ok: false, error: "Write something first." };
  if (body.length > MAX_BODY) return { ok: false, error: `Keep it under ${MAX_BODY} characters.` };

  const { error } = await supabase
    .from("reader_comments")
    .insert({ artifact_id: input.artifactId, author_id: user.id, body });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/a/${input.slug}`);
  return { ok: true };
}

export async function editComment(input: {
  commentId: string;
  slug: string;
  body: string;
}): Promise<Result> {
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "Sign in to edit." };
  const body = input.body.trim();
  if (!body) return { ok: false, error: "Comment can't be empty." };
  if (body.length > MAX_BODY) return { ok: false, error: `Keep it under ${MAX_BODY} characters.` };

  const { error } = await supabase
    .from("reader_comments")
    .update({ body, edited: true })
    .eq("id", input.commentId)
    .eq("author_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/a/${input.slug}`);
  return { ok: true };
}

export async function deleteComment(input: { commentId: string; slug: string }): Promise<Result> {
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "Sign in to delete." };

  const { error } = await supabase
    .from("reader_comments")
    .delete()
    .eq("id", input.commentId)
    .eq("author_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/a/${input.slug}`);
  return { ok: true };
}

export async function setSubscribed(input: {
  subscribed: boolean;
}): Promise<{ ok: true; subscribed: boolean } | { ok: false; error: string }> {
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "Sign in to subscribe." };

  if (input.subscribed) {
    const { error } = await supabase
      .from("subscriptions")
      .upsert({ user_id: user.id, scope: "all" }, { onConflict: "user_id,scope" });
    if (error) return { ok: false, error: error.message };
    return { ok: true, subscribed: true };
  }

  const { error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("scope", "all");
  if (error) return { ok: false, error: error.message };
  return { ok: true, subscribed: false };
}
