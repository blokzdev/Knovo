import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { ModerateComment } from "@/components/admin/ModerateComment";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  body: string;
  status: "visible" | "hidden" | "removed";
  created_at: string;
  edited: boolean;
  artifact_id: string;
  artifact: { slug: string; title: string } | null;
  author: { display_name: string | null; email: string | null } | null;
};

const STATUS_STYLE: Record<Row["status"], string> = {
  visible: "bg-emerald-50 text-emerald-700",
  hidden: "bg-amber-50 text-amber-700",
  removed: "bg-red-50 text-red-700",
};

export default async function ModerationPage() {
  // Service-role read: the admin layout already gates access; this gives a complete view
  // including hidden/removed comments regardless of the public RLS filter.
  const db = createAdminClient();
  const { data } = await db
    .from("reader_comments")
    .select(
      "id, body, status, created_at, edited, artifact_id, artifact:artifacts(slug, title), author:profiles(display_name, email)",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  const comments = (data ?? []) as unknown as Row[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Discussion</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reader comments across all artifacts. Hide or remove anything off-topic or abusive.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        {comments.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No reader comments yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {comments.map((c) => (
              <li key={c.id} className="space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  <span className={cn("rounded-full px-2 py-0.5 font-medium", STATUS_STYLE[c.status])}>
                    {c.status}
                  </span>
                  <span className="font-medium text-neutral-700">
                    {c.author?.display_name?.trim() || c.author?.email || "Reader"}
                  </span>
                  <span>· {new Date(c.created_at).toLocaleDateString()}</span>
                  {c.edited && <span>· edited</span>}
                  {c.artifact && (
                    <>
                      <span>· on</span>
                      <Link href={`/a/${c.artifact.slug}`} className="underline hover:text-neutral-900">
                        {c.artifact.title}
                      </Link>
                    </>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6 text-neutral-700">{c.body}</p>
                <ModerateComment
                  commentId={c.id}
                  status={c.status}
                  artifactId={c.artifact_id}
                  slug={c.artifact?.slug ?? ""}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
