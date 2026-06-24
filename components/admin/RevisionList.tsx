"use client";

import * as React from "react";
import { toast } from "sonner";
import { GitCompare, History, Loader2 } from "lucide-react";
import { restoreRevision } from "@/lib/admin/actions";
import { diffLines, diffStats, flattenDoc } from "@/lib/admin/doc-text";
import { cn, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ActorBadge, type ProfileMap } from "@/components/admin/activity/ActorBadge";

export type RevisionRow = {
  id: string;
  doc: unknown;
  note: string | null;
  created_by: string | null;
  created_at: string;
  schema_version: number;
};

export function RevisionList({
  artifactId,
  currentDoc,
  revisions,
  profiles,
  currentUserId,
}: {
  artifactId: string;
  currentDoc: unknown;
  revisions: RevisionRow[];
  profiles?: ProfileMap;
  currentUserId?: string;
}) {
  if (revisions.length === 0) {
    return <p className="px-1 py-6 text-center text-sm text-muted-foreground">No revisions yet.</p>;
  }
  const total = revisions.length;
  return (
    <ul className="space-y-1.5">
      {revisions.map((r, i) => (
        <RevisionItem
          key={r.id}
          artifactId={artifactId}
          currentDoc={currentDoc}
          revision={r}
          version={total - i}
          total={total}
          profiles={profiles}
          currentUserId={currentUserId}
        />
      ))}
    </ul>
  );
}

function RevisionItem({
  artifactId,
  currentDoc,
  revision,
  version,
  total,
  profiles,
  currentUserId,
}: {
  artifactId: string;
  currentDoc: unknown;
  revision: RevisionRow;
  version: number;
  total: number;
  profiles?: ProfileMap;
  currentUserId?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();

  // Diff this revision → the current live doc (what restoring would revert).
  const diff = React.useMemo(
    () => diffLines(flattenDoc(revision.doc), flattenDoc(currentDoc)),
    [revision.doc, currentDoc],
  );
  const stats = diffStats(diff);
  const identical = stats.added === 0 && stats.removed === 0;

  const restore = () =>
    start(async () => {
      const res = await restoreRevision({ artifactId, revisionId: revision.id });
      if (res.ok) {
        toast.success("Restored this version");
        setOpen(false);
      } else {
        toast.error("Couldn't restore", { description: res.error });
      }
    });

  return (
    <li className="rounded-md border border-border bg-card px-3 py-2 text-xs">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <ActorBadge actor={revision.created_by} profiles={profiles} currentUserId={currentUserId} />
        <span className="rounded bg-muted px-1 py-px text-[10px] font-medium text-muted-foreground">
          v{version} of {total}
        </span>
        <time
          dateTime={revision.created_at}
          aria-label={new Date(revision.created_at).toLocaleString()}
          title={new Date(revision.created_at).toLocaleString()}
          className="ml-auto whitespace-nowrap tabular-nums text-muted-foreground"
        >
          {timeAgo(revision.created_at)}
        </time>
      </div>
      {revision.note && <p className="mt-1 text-muted-foreground">{revision.note}</p>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="mt-2 h-7">
            <GitCompare className="h-3.5 w-3.5" /> Compare &amp; restore
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Version {version} vs current</DialogTitle>
            <DialogDescription>
              {identical ? (
                "Identical to the current document."
              ) : (
                <>
                  Restoring reverts the current document to this version (
                  <span className="text-emerald-600 dark:text-emerald-400">+{stats.removed}</span>{" "}
                  <span className="text-red-600 dark:text-red-400">−{stats.added}</span> lines change). The current doc is
                  snapshotted first.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[55vh] overflow-auto rounded-md border border-border bg-muted/30 p-2 font-mono text-[11px] leading-5">
            {diff.map((l, idx) => (
              <div
                key={idx}
                className={cn(
                  "whitespace-pre-wrap break-words px-1",
                  l.type === "add" && "bg-red-500/10 text-red-700 dark:text-red-300",
                  l.type === "remove" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                  l.type === "same" && "text-muted-foreground",
                )}
              >
                <span className="select-none opacity-60">{l.type === "add" ? "− " : l.type === "remove" ? "+ " : "  "}</span>
                {l.text || " "}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button disabled={pending || identical} onClick={restore}>
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <History className="h-3.5 w-3.5" />} Restore this
              version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}
