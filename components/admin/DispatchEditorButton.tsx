"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Bot } from "lucide-react";
import { dispatchWorker } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";

// Fire the Editor worker now, pointed at this artifact. The worker reads the full open-directive
// queue from the API; the text payload just nudges it to act on this one immediately.
export function DispatchEditorButton({ artifactId, slug }: { artifactId: string; slug: string }) {
  const [pending, start] = useTransition();
  const run = () =>
    start(async () => {
      const r = await dispatchWorker({
        worker: "editor",
        artifactId,
        text: `Process the open directives on artifact ${artifactId} (slug: ${slug}) now.`,
      });
      if (r.ok) {
        toast.success("Editor dispatched", {
          description: "It will act on the open directives.",
          action: { label: "Open session", onClick: () => window.open(r.sessionUrl, "_blank") },
        });
      } else {
        toast.error("Couldn't dispatch Editor", { description: r.error });
      }
    });
  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={run}>
      <Bot className="h-3.5 w-3.5" /> Send to Editor now
    </Button>
  );
}
