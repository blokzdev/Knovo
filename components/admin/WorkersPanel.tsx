import { WORKER_META } from "@/lib/admin/labels";
import type { WorkerId } from "@/lib/routines";
import { Card, CardContent } from "@/components/ui/card";
import { DispatchButton } from "./DispatchButton";

const WORKERS: WorkerId[] = ["scout", "editor", "keeper"];

export function WorkersPanel() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {WORKERS.map((w) => (
        <Card key={w}>
          <CardContent className="flex flex-col gap-2 p-4">
            <div className="text-sm font-semibold">{WORKER_META[w].label}</div>
            <p className="text-xs text-muted-foreground">{WORKER_META[w].blurb}</p>
            <DispatchButton worker={w} className="mt-1 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
