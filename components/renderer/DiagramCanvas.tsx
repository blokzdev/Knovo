"use client";

import { TldrawImage } from "tldraw";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { useTheme } from "next-themes";
import "tldraw/tldraw.css";

// The lazily-loaded chunk that actually pulls tldraw (heavy bundle + CSS). Kept out of the main
// bundle via the dynamic(ssr:false) import in DiagramStage.tsx.
//
// We render the snapshot to a STATIC SVG once with <TldrawImage> — no tldraw editor or reactive
// store is mounted at runtime — then wrap that SVG in a featherweight pan/zoom container so the
// reader can pan/zoom/pinch a diagram with none of the editor's weight or scroll-jacking.
type TldrawSnapshot = Parameters<typeof TldrawImage>[0]["snapshot"];

export function DiagramCanvas({ snapshot }: { snapshot: Record<string, unknown> }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    // Key on the theme so the SVG is cleanly regenerated (not just recolored) when it flips.
    <TransformWrapper
      key={isDark ? "dark" : "light"}
      minScale={0.5}
      centerOnInit
      limitToBounds={false}
      doubleClick={{ mode: "zoomIn" }}
      // Wheel-zoom only with Ctrl/Cmd held, so normal page scrolling is never hijacked.
      wheel={{ activationKeys: ["Control", "Meta"] }}
      pinch={{ disabled: false }}
      panning={{ velocityDisabled: true }}
    >
      <TransformComponent
        wrapperClass="!h-full !w-full"
        contentClass="!h-full !w-full items-center justify-center"
      >
        <TldrawImage
          snapshot={snapshot as unknown as TldrawSnapshot}
          darkMode={isDark}
          background={false}
          padding="auto"
        />
      </TransformComponent>
    </TransformWrapper>
  );
}
