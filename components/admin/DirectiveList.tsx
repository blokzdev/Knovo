"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { resolveComment } from "@/lib/admin/actions";
import { type DirectiveAction } from "@/lib/admin/labels";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DirectiveBadges } from "@/components/admin/DirectiveBadges";
import { ActorBadge, type ProfileMap } from "@/components/admin/activity/ActorBadge";

export type DirectiveRow = {
  id: string;
  note: string | null;
  action: DirectiveAction | null;
  publish_after: boolean;
  status: "open" | "addressed" | "dismissed";
  created_at: string;
  addressed_by: string | null;
  options: { raised_by?: string; severity?: string } | null;
};

export function DirectiveList({
  artifactId,
  directives,
  profiles,
  currentUserId,
}: {
  artifactId: string;
  directives: DirectiveRow[];
  profiles?: ProfileMap;
  currentUserId?: string;
}) {
  if (directives.length === 0) {
    return <p className="px-1 py-6 text-center text-sm text-muted-foreground">No directives yet.</p>;
  }
  return (
    <ul className="space-y-2">
      {directives.map((d) => (
        <Item key={d.id} artifactId={artifactId} d={d} profiles={profiles} currentUserId={currentUserId} />
      ))}
    </ul>
  );
}

function Item({
  artifactId,
  d,
  profiles,
  currentUserId,
}: {
  artifactId: string;
  d: DirectiveRow;
  profiles?: ProfileMap;
  currentUserId?: string;
}) {
  const [pending, start] = useTransition();
  const resolve = (disposition: "addressed" | "dismissed") =>
    start(async () => {
      const r = await resolveComment({ commentId: d.id, artifactId, disposition });
      if (!r.ok) toast.error("Couldn't update", { description: r.error });
    });

  const isFlag = Boolean(!d.action && !d.publish_after && d.options?.raised_by);
  const open = d.status === "open";

  return (
    <li className={cn("rounded-lg border p-3 text-sm", open ? "border-border bg-card" : "border-border bg-muted opacity-70")}>
      <div className="flex flex-wrap items-center gap-2">
        <DirectiveBadges
          action={d.action}
          publishAfter={d.publish_after}
          severity={d.options?.severity}
          isFlag={isFlag}
        />
        {d.options?.raised_by && <ActorBadge actor={d.options.raised_by} profiles={profiles} currentUserId={currentUserId} />}
        {!open && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            {d.status}
            {d.addressed_by && (
              <ActorBadge actor={d.addressed_by} profiles={profiles} currentUserId={currentUserId} showIcon={false} />
            )}
          </span>
        )}
      </div>
      {d.note && <p className="mt-1.5 leading-5 text-foreground">{d.note}</p>}
      {open && (
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="outline" disabled={pending} onClick={() => resolve("addressed")}>
            <Check className="h-3.5 w-3.5" /> Mark addressed
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => resolve("dismissed")}>
            <X className="h-3.5 w-3.5" /> Dismiss
          </Button>
        </div>
      )}
    </li>
  );
}
