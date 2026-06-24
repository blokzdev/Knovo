"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Ban, Check, Loader2, MessageSquare, Pencil, Send } from "lucide-react";
import { setStatus } from "@/lib/admin/actions";
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
import { DirectiveComposer } from "@/components/admin/DirectiveComposer";

// Inline governed actions for a queue card — the same admin server actions the detail page uses, so
// the whole pipeline is triaged without leaving the board. Which buttons appear depends on the lane
// (status). Publish + Reject confirm first; "Direct" opens the directive composer in a dialog.
//
// `busy` tracks WHICH action is in flight so the spinner sits on the control the user pressed (not
// always Publish), and so we clear it BEFORE closing a confirm dialog — that way Radix restores focus
// to a re-enabled trigger instead of dropping it to <body>.
export function QueueCardActions({
  artifactId,
  status,
  title,
}: {
  artifactId: string;
  status: Status;
  title: string;
}) {
  const [, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [directOpen, setDirectOpen] = useState(false);
  const [reason, setReason] = useState("");

  const run = (key: string, to: Status, ok: string, opts?: { reason?: string; onDone?: () => void }) =>
    start(async () => {
      setBusy(key);
      const r = await setStatus({ artifactId, to, reason: opts?.reason });
      setBusy(null); // re-enable triggers before any dialog close so focus restores correctly
      if (r.ok) {
        toast.success(ok);
        opts?.onDone?.();
      } else {
        toast.error("Action failed", { description: r.error });
      }
    });

  const disabled = busy !== null;
  const inReview = status === "needs_review" || status === "changes_requested";
  const canApprove = inReview || status === "draft";
  const canRequestChanges = inReview || status === "approved";
  const canReject = status !== "approved";
  const btn = "h-7 px-2 text-xs";
  const ico = (key: string, Icon: typeof Check) =>
    busy === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {canApprove && (
        <Button variant="outline" className={btn} disabled={disabled} aria-busy={busy === "approve"} onClick={() => run("approve", "approved", "Approved")}>
          {ico("approve", Check)} Approve
        </Button>
      )}
      <Button className={btn} disabled={disabled} onClick={() => setPublishOpen(true)}>
        <Send className="h-3.5 w-3.5" /> Publish
      </Button>
      {canRequestChanges && (
        <Button variant="outline" className={btn} disabled={disabled} aria-busy={busy === "changes"} onClick={() => run("changes", "changes_requested", "Marked changes requested")}>
          {ico("changes", Pencil)} Changes
        </Button>
      )}
      <Button variant="outline" className={btn} disabled={disabled} onClick={() => setDirectOpen(true)}>
        <MessageSquare className="h-3.5 w-3.5" /> Direct
      </Button>
      {canReject && (
        <Button variant="ghost" className={`${btn} text-destructive`} disabled={disabled} onClick={() => setRejectOpen(true)}>
          <Ban className="h-3.5 w-3.5" /> Reject
        </Button>
      )}

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish &ldquo;{title}&rdquo;?</DialogTitle>
            <DialogDescription>
              It becomes publicly visible at its clean URL.
              {status === "draft" && " This draft hasn't been through review."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishOpen(false)}>Cancel</Button>
            <Button disabled={disabled} aria-busy={busy === "publish"} onClick={() => run("publish", "published", "Published", { onDone: () => setPublishOpen(false) })}>
              {ico("publish", Send)} Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject &ldquo;{title}&rdquo;</DialogTitle>
            <DialogDescription>Terminal — the primary source won&apos;t be re-drafted. Add a reason.</DialogDescription>
          </DialogHeader>
          <Textarea aria-label="Rejection reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason…" rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={disabled}
              aria-busy={busy === "reject"}
              onClick={() => run("reject", "rejected", "Rejected", { reason, onDone: () => { setRejectOpen(false); setReason(""); } })}
            >
              {ico("reject", Ban)} Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={directOpen} onOpenChange={setDirectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Direct the Editor</DialogTitle>
            <DialogDescription>
              Leave an instruction for &ldquo;{title}&rdquo; — it enters the Editor&apos;s queue.
            </DialogDescription>
          </DialogHeader>
          <DirectiveComposer artifactId={artifactId} onSubmitted={() => setDirectOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
