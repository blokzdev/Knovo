"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { moderateReaderComment } from "@/lib/admin/actions";
import type { Database } from "@/lib/database.types";

type Status = Database["public"]["Enums"]["reader_comment_status"];

export function ModerateComment({
  commentId,
  status,
  artifactId,
  slug,
}: {
  commentId: string;
  status: Status;
  artifactId: string;
  slug: string;
}) {
  const [pending, start] = useTransition();

  const set = (to: Status) =>
    start(async () => {
      const res = await moderateReaderComment({ commentId, to, artifactId, slug });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Comment ${to}.`);
    });

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "visible" && (
        <Button size="sm" variant="outline" onClick={() => set("visible")} disabled={pending}>
          Restore
        </Button>
      )}
      {status !== "hidden" && (
        <Button size="sm" variant="outline" onClick={() => set("hidden")} disabled={pending}>
          Hide
        </Button>
      )}
      {status !== "removed" && (
        <Button size="sm" variant="ghost" onClick={() => set("removed")} disabled={pending}>
          Remove
        </Button>
      )}
    </div>
  );
}
