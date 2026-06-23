import { listComments } from "@/lib/reader/queries";
import type { Viewer } from "@/lib/reader/viewer";
import { CommentComposer } from "./CommentComposer";
import { CommentItem } from "./CommentItem";

// Public discussion thread for an artifact. RLS returns only visible comments on the published
// artifact; admins moderate via the HUD.
export async function Comments({
  artifactId,
  slug,
  viewer,
}: {
  artifactId: string;
  slug: string;
  viewer: Viewer | null;
}) {
  const comments = await listComments(artifactId);

  return (
    <section className="mt-12 border-t border-border pt-8">
      <h2 className="text-lg font-semibold">
        Discussion {comments.length > 0 && <span className="font-normal text-muted-foreground">· {comments.length}</span>}
      </h2>

      {viewer ? (
        <div className="mt-4">
          <CommentComposer artifactId={artifactId} slug={slug} />
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Sign in to join the discussion.</p>
      )}

      <ul className="mt-8 space-y-6">
        {comments.length === 0 ? (
          <li className="text-sm text-muted-foreground">No comments yet — be the first.</li>
        ) : (
          comments.map((c) => (
            <li key={c.id}>
              <CommentItem comment={c} slug={slug} isOwn={viewer?.id === c.author_id} />
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
