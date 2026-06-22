"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { postComment } from "@/lib/reader/actions";

export function CommentComposer({ artifactId, slug }: { artifactId: string; slug: string }) {
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      const res = await postComment({ artifactId, slug, body });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setBody("");
      toast.success("Comment posted.");
    });

  return (
    <div className="space-y-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share a question or insight…"
        rows={3}
        maxLength={5000}
      />
      <div className="flex justify-end">
        <Button size="sm" onClick={submit} disabled={pending || !body.trim()}>
          Post
        </Button>
      </div>
    </div>
  );
}
