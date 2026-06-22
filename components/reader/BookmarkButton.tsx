"use client";

import { useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleBookmark } from "@/lib/reader/actions";
import { cn } from "@/lib/utils";

export function BookmarkButton({
  artifactId,
  slug,
  initial,
  signedIn,
}: {
  artifactId: string;
  slug: string;
  initial: boolean;
  signedIn: boolean;
}) {
  const [bookmarked, setBookmarked] = useState(initial);
  const [pending, start] = useTransition();

  const onClick = () =>
    start(async () => {
      if (!signedIn) {
        toast.error("Sign in to save articles.");
        return;
      }
      const res = await toggleBookmark({ artifactId, slug });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setBookmarked(res.bookmarked);
      toast.success(res.bookmarked ? "Saved." : "Removed from saved.");
    });

  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={pending} aria-pressed={bookmarked}>
      <Bookmark className={cn("h-4 w-4", bookmarked && "fill-current")} />
      {bookmarked ? "Saved" : "Save"}
    </Button>
  );
}
