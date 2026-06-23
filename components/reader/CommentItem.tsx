"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/common/Avatar";
import { focusRing } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { editComment, deleteComment } from "@/lib/reader/actions";
import type { ReaderComment } from "@/lib/reader/queries";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function CommentItem({
  comment,
  slug,
  isOwn,
}: {
  comment: ReaderComment;
  slug: string;
  isOwn: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(comment.body);
  const [pending, start] = useTransition();

  const name = comment.author?.display_name?.trim() || "Reader";

  const saveEdit = () =>
    start(async () => {
      const res = await editComment({ commentId: comment.id, slug, body });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setEditing(false);
      toast.success("Updated.");
    });

  const remove = () =>
    start(async () => {
      const res = await deleteComment({ commentId: comment.id, slug });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Deleted.");
    });

  return (
    <div className="flex gap-3">
      <Avatar name={name} src={comment.author?.avatar_url} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{name}</span>
          <span className="text-xs text-muted-foreground">
            {fmtDate(comment.created_at)}
            {comment.edited ? " · edited" : ""}
          </span>
        </div>

        {editing ? (
          <div className="mt-2 space-y-2">
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={5000} />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveEdit} disabled={pending || !body.trim()}>
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setBody(comment.body);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground">{comment.body}</p>
        )}

        {isOwn && !editing && (
          <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
            <button onClick={() => setEditing(true)} className={`rounded-sm hover:text-foreground ${focusRing}`}>
              Edit
            </button>
            <button onClick={remove} disabled={pending} className={`rounded-sm hover:text-destructive ${focusRing}`}>
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
