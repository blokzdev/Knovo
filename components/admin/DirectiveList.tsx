"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { resolveComment } from "@/lib/admin/actions";
import { ACTION_LABELS, SEVERITY_CLS, type DirectiveAction } from "@/lib/admin/labels";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
}: {
  artifactId: string;
  directives: DirectiveRow[];
}) {
  if (directives.length === 0) {
    return <p className="px-1 py-6 text-center text-sm text-muted-foreground">No directives yet.</p>;
  }
  return (
    <ul className="space-y-2">
      {directives.map((d) => (
        <Item key={d.id} artifactId={artifactId} d={d} />
      ))}
    </ul>
  );
}

function Item({ artifactId, d }: { artifactId: string; d: DirectiveRow }) {
  const [pending, start] = useTransition();
  const resolve = (disposition: "addressed" | "dismissed") =>
    start(async () => {
      const r = await resolveComment({ commentId: d.id, artifactId, disposition });
      if (!r.ok) toast.error("Couldn't update", { description: r.error });
    });

  const isFlag = !d.action && !d.publish_after && d.options?.raised_by;
  const severity = d.options?.severity;
  const open = d.status === "open";

  return (
    <li
      className={cn(
        "rounded-lg border p-3 text-sm",
        open ? "border-neutral-200 bg-white" : "border-neutral-100 bg-neutral-50 opacity-70",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {d.action && (
          <span className="rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-700">
            {ACTION_LABELS[d.action]}
          </span>
        )}
        {d.publish_after && (
          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700">
            publish after
          </span>
        )}
        {isFlag && (
          <span
            className={cn(
              "rounded-md border px-1.5 py-0.5 text-xs font-medium",
              SEVERITY_CLS[severity ?? "info"] ?? SEVERITY_CLS.info,
            )}
          >
            flag · {severity ?? "info"}
          </span>
        )}
        {d.options?.raised_by && (
          <span className="text-xs text-muted-foreground">{d.options.raised_by}</span>
        )}
        {!open && (
          <span className="text-xs text-muted-foreground">
            {d.status} {d.addressed_by ? `· ${d.addressed_by}` : ""}
          </span>
        )}
      </div>
      {d.note && <p className="mt-1.5 leading-5 text-neutral-700">{d.note}</p>}
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
