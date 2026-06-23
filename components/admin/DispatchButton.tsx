"use client";

import type { ReactNode } from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Play } from "lucide-react";
import { dispatchWorker } from "@/lib/admin/actions";
import { WORKER_META } from "@/lib/admin/labels";
import type { WorkerId } from "@/lib/routines";
import { Button, type ButtonProps } from "@/components/ui/button";

// One dispatch control for the whole HUD: fire a worker routine "now", toast the result with a link
// to the running session. Used by the dashboard WorkersPanel, the artifact toolbar, and the
// settings "Test" action. `text` nudges the worker toward a specific task; `artifactId` scopes the
// audit + revalidation.
export function DispatchButton({
  worker,
  label,
  text,
  artifactId,
  disabled,
  variant = "outline",
  size = "sm",
  className,
  children,
}: {
  worker: WorkerId;
  label?: string;
  text?: string;
  artifactId?: string;
  disabled?: boolean;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  children?: ReactNode;
}) {
  const [pending, start] = useTransition();
  const run = () =>
    start(async () => {
      const r = await dispatchWorker({ worker, text, artifactId });
      if (r.ok) {
        toast.success(`${WORKER_META[worker].label} dispatched`, {
          description: "A new session is running.",
          action: { label: "Open session", onClick: () => window.open(r.sessionUrl, "_blank") },
        });
      } else {
        toast.error(`Couldn't dispatch ${WORKER_META[worker].label}`, { description: r.error });
      }
    });

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={pending || disabled}
      onClick={run}
    >
      {pending ? <Loader2 className="animate-spin" /> : <Play />}
      {children ?? label ?? WORKER_META[worker].cta}
    </Button>
  );
}
