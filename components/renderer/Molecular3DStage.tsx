"use client";

import { useEffect, useRef, useState } from "react";
import type { ArtifactDocV1 } from "@/lib/artifact-schema";

type Mol3D = Extract<ArtifactDocV1["stage"], { kind: "molecular3d" }>;
type Representation = Mol3D["representation"];

// Minimal structural typing for the 3Dmol.js viewer (the package ships no usable types here).
type MolViewer = {
  setStyle: (sel: object, style: object) => void;
  zoomTo: () => void;
  render: () => void;
  clear?: () => void;
};
type Mol3DModule = {
  createViewer: (el: HTMLElement, opts: object) => MolViewer;
  download: (query: string, viewer: MolViewer, opts: object, cb: () => void) => void;
  default?: Mol3DModule;
};

// 3Dmol.js is loaded lazily (client-only) so it never touches SSR or the server bundle. The
// structure is fetched directly from RCSB by PDB id. Highlight selection→3D mapping (the slot
// schema's open "selection grammar" question) is deferred — highlights are listed as captions.
function styleFor(rep: Representation): Record<string, unknown> {
  switch (rep) {
    case "sticks":
      return { stick: {} };
    case "spheres":
      return { sphere: {} };
    case "surface":
    case "cartoon":
    default:
      return { cartoon: { color: "spectrum" } };
  }
}

export function Molecular3DStage({
  stage,
  representation,
}: {
  stage: Mol3D;
  representation: Representation;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<MolViewer | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const isPdb = stage.source.db === "pdb";

  // Load the structure once per PDB id.
  useEffect(() => {
    if (!isPdb || !hostRef.current) {
      setStatus("error");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    (async () => {
      try {
        const mod = (await import("3dmol")) as unknown as Mol3DModule;
        const $3Dmol = mod.default ?? mod;
        if (cancelled || !hostRef.current) return;
        const viewer = $3Dmol.createViewer(hostRef.current, { backgroundColor: "white" });
        viewerRef.current = viewer;
        $3Dmol.download(`pdb:${stage.source.uid}`, viewer, {}, () => {
          if (cancelled) return;
          viewer.setStyle({}, styleFor(representation));
          viewer.zoomTo();
          viewer.render();
          setStatus("ready");
        });
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      try {
        viewerRef.current?.clear?.();
      } catch {
        /* noop */
      }
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage.source.uid, isPdb]);

  // Re-style on representation change without reloading the structure.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || status !== "ready") return;
    viewer.setStyle({}, styleFor(representation));
    viewer.render();
  }, [representation, status]);

  return (
    <div className="relative h-[360px] w-full overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div ref={hostRef} className="absolute inset-0" />
      {status !== "ready" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/70 text-sm text-neutral-500">
          {status === "loading"
            ? `Loading ${stage.source.uid.toUpperCase()} from RCSB…`
            : isPdb
              ? `Could not load ${stage.source.uid.toUpperCase()}.`
              : "3D view supports PDB sources."}
        </div>
      )}
    </div>
  );
}
