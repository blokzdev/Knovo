"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Play } from "lucide-react";
import { dispatchWorker } from "@/lib/admin/actions";
import { WORKER_META } from "@/lib/admin/labels";
import type { WorkerId } from "@/lib/routines";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const WORKERS: WorkerId[] = ["scout", "editor", "keeper"];

export function WorkersPanel() {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<WorkerId | null>(null);

  const run = (worker: WorkerId) =>
    start(async () => {
      setBusy(worker);
      const r = await dispatchWorker({ worker });
      setBusy(null);
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
    <div className="grid gap-3 sm:grid-cols-3">
      {WORKERS.map((w) => (
        <Card key={w}>
          <CardContent className="flex flex-col gap-2 p-4">
            <div className="text-sm font-semibold">{WORKER_META[w].label}</div>
            <p className="text-xs text-muted-foreground">{WORKER_META[w].blurb}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-1 w-full"
              disabled={pending && busy === w}
              onClick={() => run(w)}
            >
              <Play className="h-3.5 w-3.5" /> {WORKER_META[w].cta}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
