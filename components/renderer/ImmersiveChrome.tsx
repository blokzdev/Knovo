"use client";

import { useState, type RefObject } from "react";
import { BookOpen, Minimize2, PanelRight } from "lucide-react";
import type { ArtifactDocV1 } from "@/lib/artifact-schema";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { PanelBlock } from "./panels";
import { CaptionList } from "./CaptionList";
import { ProvenanceFooter, type ProvenanceSource } from "./ProvenanceFooter";

type Caption = ArtifactDocV1["captions"][number];
type Panel = ArtifactDocV1["panels"][number];

// The immersive overlay's top bar: title + buttons that open the panels ("Details") and
// provenance ("Sources") drawers, and the exit button. The drawers reuse the Radix-based Sheet
// (portal + scroll-lock + focus-trap + Escape, all free). Rendered only while immersive; the
// stage itself stays mounted in InteractiveStage so the live viewer is never reloaded.
export function ImmersiveChrome({
  title,
  captions,
  panels,
  sources,
  onExit,
  exitButtonRef,
}: {
  title: string;
  captions: Caption[];
  panels: Panel[];
  sources: ProvenanceSource[];
  onExit: () => void;
  exitButtonRef: RefObject<HTMLButtonElement>;
}) {
  const [panelsOpen, setPanelsOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const captionsFor = (id: string) => captions.filter((c) => c.target === id);

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border pb-2">
      <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{title}</h2>

      {panels.length > 0 && (
        <Button variant="outline" size="sm" onClick={() => setPanelsOpen(true)} aria-label="Show details">
          <PanelRight />
          <span className="hidden sm:inline">Details</span>
        </Button>
      )}
      {sources.length > 0 && (
        <Button variant="outline" size="sm" onClick={() => setSourcesOpen(true)} aria-label="Show sources">
          <BookOpen />
          <span className="hidden sm:inline">Sources</span>
        </Button>
      )}
      <Button
        ref={exitButtonRef}
        variant="ghost"
        size="icon"
        onClick={onExit}
        aria-label="Exit fullscreen"
        title="Exit fullscreen (Esc)"
      >
        <Minimize2 />
      </Button>

      <Sheet open={panelsOpen} onOpenChange={setPanelsOpen}>
        <SheetContent side="right" className="w-[min(420px,92vw)] overflow-y-auto">
          <SheetTitle>Details</SheetTitle>
          <div className="mt-4 space-y-5">
            {panels.map((p) => (
              <section key={p.id} className="space-y-2">
                <PanelBlock panel={p} />
                <CaptionList captions={captionsFor(p.id)} />
              </section>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={sourcesOpen} onOpenChange={setSourcesOpen}>
        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
          <SheetTitle>Sources</SheetTitle>
          <ProvenanceFooter sources={sources} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
