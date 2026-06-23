"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import type { ArtifactDocV1 } from "@/lib/artifact-schema";
import {
  getRepresentation,
  getSpin,
  isHighlightVisible,
  DEFAULT_HIGHLIGHT_COLOR,
  type ParamsMap,
} from "@/lib/renderer/params";
import { parseSelection } from "@/lib/renderer/selection";

type Mol3D = Extract<ArtifactDocV1["stage"], { kind: "molecular3d" }>;
type Representation = Mol3D["representation"];

// Minimal structural typing for the 3Dmol.js viewer (the package ships no usable types here).
type MolViewer = {
  setStyle: (sel: object, style: object) => void;
  addStyle: (sel: object, style: object) => void;
  spin: (axis: string | boolean) => void;
  zoomTo: (sel?: object) => void;
  setBackgroundColor?: (color: string) => void;
  render: () => void;
  clear?: () => void;
};
type Mol3DModule = {
  createViewer: (el: HTMLElement, opts: object) => MolViewer;
  download: (query: string, viewer: MolViewer, opts: object, cb: () => void) => void;
  default?: Mol3DModule;
};

// 3Dmol.js is loaded lazily (client-only) so it never touches SSR or the server bundle. The
// structure is fetched directly from RCSB by PDB id. Highlights map the slot schema's selection
// grammar (lib/renderer/selection.ts) onto colored 3D styles over the base representation.
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

// A highlight overrides the base style on its selection with a solid color. surface falls back to
// cartoon, matching styleFor (real surface rendering is a follow-up).
function coloredStyleFor(rep: Representation, color: string): Record<string, unknown> {
  switch (rep) {
    case "sticks":
      return { stick: { color } };
    case "spheres":
      return { sphere: { color } };
    case "surface":
    case "cartoon":
    default:
      return { cartoon: { color } };
  }
}

export function Molecular3DStage({ stage, params }: { stage: Mol3D; params: ParamsMap }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<MolViewer | null>(null);
  const cameraSetRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const isPdb = stage.source.db === "pdb";
  const { resolvedTheme } = useTheme();
  // Match the --card surface so the viewer blends with its container in both themes.
  const bgColor = resolvedTheme === "dark" ? "#171717" : "#ffffff";

  const rep = getRepresentation(params, stage);
  const spin = getSpin(params);
  // A precise signature of everything that affects the paint, so the re-style effect re-runs
  // exactly when one of those inputs changes (and not on every unrelated render).
  const styleKey = JSON.stringify({
    rep,
    spin,
    highlights: stage.highlights.map((h) => [h.id, isHighlightVisible(params, h.id), h.color ?? null]),
  });

  // Load the structure once per PDB id; the re-style effect paints once status flips to ready.
  useEffect(() => {
    if (!isPdb || !hostRef.current) {
      setStatus("error");
      return;
    }
    let cancelled = false;
    cameraSetRef.current = false;
    setStatus("loading");
    (async () => {
      try {
        const mod = (await import("3dmol")) as unknown as Mol3DModule;
        const $3Dmol = mod.default ?? mod;
        if (cancelled || !hostRef.current) return;
        const viewer = $3Dmol.createViewer(hostRef.current, { backgroundColor: bgColor });
        viewerRef.current = viewer;
        $3Dmol.download(`pdb:${stage.source.uid}`, viewer, {}, () => {
          if (cancelled) return;
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

  // Idempotent re-paint: base style, then re-add the visible highlights, then spin. Recomputed
  // from scratch on every relevant change so toggles never accumulate. styleKey is the precise
  // value signature of the inputs (representation / highlight visibility+color / spin).
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || status !== "ready") return;

    viewer.setStyle({}, styleFor(rep));
    for (const h of stage.highlights) {
      if (!isHighlightVisible(params, h.id)) continue;
      const spec = parseSelection(h.selection);
      if (!spec) continue; // unparseable selection -> skip this highlight, never throw
      viewer.addStyle(spec, coloredStyleFor(rep, h.color ?? DEFAULT_HIGHLIGHT_COLOR));
    }
    viewer.spin(spin ? "y" : false);

    // Best-effort initial camera (advisory): on first paint only, frame the highlight named by
    // initialCamera.preset if it maps to one; otherwise frame the whole structure. Never refit on
    // later re-styles so the camera doesn't jump while the reader interacts.
    if (!cameraSetRef.current) {
      cameraSetRef.current = true;
      const preset = stage.initialCamera?.preset;
      const target = preset ? stage.highlights.find((h) => h.id === preset) : undefined;
      const sel = target ? parseSelection(target.selection) : null;
      viewer.zoomTo(sel ?? undefined);
    }
    viewer.render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleKey, status]);

  // Keep the viewer background in sync with the active theme.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || status !== "ready") return;
    viewer.setBackgroundColor?.(bgColor);
    viewer.render();
  }, [bgColor, status]);

  return (
    <div className="relative h-[clamp(300px,50vh,360px)] w-full overflow-hidden rounded-lg border border-border bg-card">
      <div ref={hostRef} className="absolute inset-0" />
      {status !== "ready" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/70 text-sm text-muted-foreground">
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
