"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Pencil, Ban, Send, Archive, Trash2, RotateCcw } from "lucide-react";
import { setStatus, setDeleted } from "@/lib/admin/actions";
import type { Status } from "@/lib/admin/labels";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function StatusControls({
  artifactId,
  status,
  deleted,
}: {
  artifactId: string;
  status: Status;
  deleted: boolean;
}) {
  const [pending, start] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reason, setReason] = useState("");

  const go = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    start(async () => {
      const r = await fn();
      if (r.ok) toast.success(ok);
      else toast.error("Action failed", { description: r.error });
    });

  const toStatus = (to: Status, ok: string, opts?: { reason?: string }) =>
    go(() => setStatus({ artifactId, to, reason: opts?.reason }), ok);

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => toStatus("approved", "Approved")}>
        <Check className="h-3.5 w-3.5" /> Approve
      </Button>
      <Button size="sm" disabled={pending} onClick={() => setPublishOpen(true)}>
        <Send className="h-3.5 w-3.5" /> Publish
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => toStatus("changes_requested", "Marked changes requested")}
      >
        <Pencil className="h-3.5 w-3.5" /> Request changes
      </Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => setRejectOpen(true)}>
        <Ban className="h-3.5 w-3.5" /> Reject
      </Button>
      {status === "published" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => toStatus("archived", "Archived")}>
          <Archive className="h-3.5 w-3.5" /> Archive
        </Button>
      )}
      {deleted ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => go(() => setDeleted({ artifactId, deleted: false }), "Restored")}
        >
          <RotateCcw className="h-3.5 w-3.5" /> Restore
        </Button>
      ) : (
        <Button size="sm" variant="ghost" className="text-destructive" disabled={pending} onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      )}

      {/* Publish confirm */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish this artifact?</DialogTitle>
            <DialogDescription>It will become publicly visible at its clean URL.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() => {
                setPublishOpen(false);
                toStatus("published", "Published");
              }}
            >
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject with reason */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this artifact</DialogTitle>
            <DialogDescription>
              Rejection is terminal — the primary source won&apos;t be re-drafted. Add a reason.
            </DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason…" rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                setRejectOpen(false);
                toStatus("rejected", "Rejected", { reason });
                setReason("");
              }}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Soft-delete confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to trash?</DialogTitle>
            <DialogDescription>
              This soft-deletes the artifact (recoverable). It will be hidden from the public site.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                setDeleteOpen(false);
                go(() => setDeleted({ artifactId, deleted: true }), "Moved to trash");
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
