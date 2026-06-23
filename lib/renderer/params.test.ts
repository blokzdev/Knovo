import { describe, it, expect } from "vitest";
import type { ArtifactDocV1 } from "@/lib/artifact-schema";
import {
  initialParams,
  getRepresentation,
  isHighlightVisible,
  getSpin,
  getYLog,
  REPRESENTATIONS,
  DEFAULT_HIGHLIGHT_COLOR,
} from "./params";

type Stage = ArtifactDocV1["stage"];
type Control = ArtifactDocV1["controls"][number];
type Mol3D = Extract<Stage, { kind: "molecular3d" }>;

const molStage: Mol3D = {
  id: "stage",
  kind: "molecular3d",
  source: { db: "pdb", uid: "1ABC" },
  representation: "cartoon",
  highlights: [
    { id: "binder", selection: "chain B", color: "#e11" },
    { id: "iface", selection: "chain A and resi 1-3" },
  ],
};

const chartStage: Extract<Stage, { kind: "chart" }> = {
  id: "stage",
  kind: "chart",
  chartType: "bar",
  axes: { x: "target", y: "IC50" },
  series: [{ name: "x", data: [{ target: "Y", value: 8 }] }],
};

describe("initialParams", () => {
  it("builds the molecular3d floor", () => {
    const p = initialParams(molStage, []);
    expect(p["representation"]).toBe("cartoon");
    expect(p["spin"]).toBe(false);
    expect(p["highlights.binder.visible"]).toBe(true);
    expect(p["highlights.iface.visible"]).toBe(true);
  });

  it("builds the chart floor", () => {
    expect(initialParams(chartStage, [])["axes.y.log"]).toBe(false);
  });

  it("overlays a control default over the floor", () => {
    const controls: Control[] = [
      { id: "spin", label: "Spin", kind: "toggle", target: "stage", param: "spin", default: true },
    ];
    expect(initialParams(molStage, controls)["spin"]).toBe(true);
  });

  it("ignores a control with no default (floor wins)", () => {
    const controls: Control[] = [
      { id: "t", label: "Show", kind: "toggle", target: "stage", param: "highlights.binder.visible" },
    ];
    expect(initialParams(molStage, controls)["highlights.binder.visible"]).toBe(true);
  });
});

describe("typed readers", () => {
  it("getRepresentation returns a valid value or falls back to the stage default", () => {
    expect(getRepresentation({ representation: "sticks" }, molStage)).toBe("sticks");
    expect(getRepresentation({ representation: "bogus" }, molStage)).toBe("cartoon");
    expect(getRepresentation({}, molStage)).toBe("cartoon");
  });

  it("isHighlightVisible defaults to true when unset", () => {
    expect(isHighlightVisible({}, "binder")).toBe(true);
    expect(isHighlightVisible({ "highlights.binder.visible": false }, "binder")).toBe(false);
  });

  it("getSpin / getYLog coerce to boolean", () => {
    expect(getSpin({})).toBe(false);
    expect(getSpin({ spin: true })).toBe(true);
    expect(getYLog({ "axes.y.log": true })).toBe(true);
    expect(getYLog({})).toBe(false);
  });

  it("exposes the representation vocabulary and a default highlight color", () => {
    expect(REPRESENTATIONS).toContain("cartoon");
    expect(DEFAULT_HIGHLIGHT_COLOR).toMatch(/^#/);
  });
});
