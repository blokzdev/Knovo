"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { resolveComment } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";

// Cancel an open directive so the Editor won't act on it (resolves the comment as dismissed).
export function DirectiveDismissButton({ commentId, artifactId }: { commentId: string; artifactId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      className="h-7 px-2 text-xs text-muted-foreground"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await resolveComment({ commentId, artifactId, disposition: "dismissed" });
          if (r.ok) toast.success("Directive dismissed");
          else toast.error("Couldn't dismiss", { description: r.error });
        })
      }
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} Dismiss
    </Button>
  );
}
