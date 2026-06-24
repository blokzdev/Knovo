import { TONES, WORKER_META, type WorkerId } from "@/lib/admin/labels";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { WORKER_ICONS } from "./activity/icons";
import { DispatchButton } from "./DispatchButton";

const WORKERS: WorkerId[] = ["scout", "editor", "keeper"];

export function WorkersPanel() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {WORKERS.map((w) => {
        const Icon = WORKER_ICONS[w];
        return (
          <Card key={w}>
            <CardContent className="flex flex-col gap-2 p-4">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
                    TONES[WORKER_META[w].tone],
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-sm font-semibold">{WORKER_META[w].label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{WORKER_META[w].blurb}</p>
              <DispatchButton worker={w} className="mt-1 w-full" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
