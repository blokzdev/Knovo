import { Shapes } from "lucide-react";

// Placeholder for tldraw-snapshot 'diagram' stages. Interactive diagram rendering (tldraw) is
// deferred to a follow-up PR; for now we show that a diagram exists so the admin can review the
// rest of the artifact.
export function DiagramStage() {
  return (
    <div className="flex h-full min-h-[280px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted p-6 text-center">
      <Shapes className="h-7 w-7 text-muted-foreground" />
      <p className="text-sm font-medium text-muted-foreground">Diagram stage</p>
      <p className="max-w-xs text-xs text-muted-foreground">
        Interactive diagram rendering (tldraw) ships in a follow-up. The snapshot is stored and
        will render here.
      </p>
    </div>
  );
}
