"use client";

import dynamic from "next/dynamic";
import { Shapes } from "lucide-react";
import type { ArtifactDocV1 } from "@/lib/artifact-schema";
import { cn } from "@/lib/utils";

type DiagramT = Extract<ArtifactDocV1["stage"], { kind: "diagram" }>;

// tldraw is large and client-only (it touches the DOM and ships tldraw.css), so the canvas is
// lazy-loaded with ssr:false — the idiomatic Next.js pattern for a React-component library. This
// keeps tldraw entirely out of the server bundle and the main client chunk; it loads only when a
// diagram is actually rendered. (The imperative 3Dmol stage uses await-import-in-effect instead;
// here TldrawImage owns its own lifecycle, so no manual cleanup is needed.)
const DiagramCanvas = dynamic(
  () => import("./DiagramCanvas").then((m) => m.DiagramCanvas),
  {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse rounded-lg bg-muted" />,
  },
);

// Renders a `diagram` stage's tldraw snapshot read-only. See DiagramCanvas for the render path.
export function DiagramStage({ stage, fill = false }: { stage: DiagramT; fill?: boolean }) {
  // Degrade gracefully on an empty/malformed snapshot — show a placeholder, never throw.
  const isEmpty = !stage.snapshot || Object.keys(stage.snapshot).length === 0;

  return (
    <div
      className={cn(
        fill ? "h-full" : "h-[clamp(300px,50vh,360px)]",
        "relative w-full overflow-hidden rounded-lg border border-border bg-card",
      )}
    >
      {isEmpty ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center">
          <Shapes className="h-7 w-7 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Diagram unavailable</p>
        </div>
      ) : (
        <DiagramCanvas snapshot={stage.snapshot} />
      )}
    </div>
  );
}
