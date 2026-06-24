import { describe, expect, it } from "vitest";
import { diffLines, diffStats, flattenDoc } from "./doc-text";

const docA = {
  schemaVersion: 1,
  title: "Imatinib selectivity",
  summary: "ABL vs SRC.",
  stage: { kind: "chart", chartType: "bar", axes: { x: "target", y: "Ki" }, series: [{ name: "Imatinib", data: [1, 2] }] },
  panels: [{ id: "moa", kind: "prose", content: "ATP-competitive inhibitor." }],
  controls: [],
  captions: [{ target: "stage", text: "Lower is better." }],
};

describe("flattenDoc", () => {
  it("extracts readable lines from a slot doc", () => {
    const lines = flattenDoc(docA);
    expect(lines).toContain("# Imatinib selectivity");
    expect(lines).toContain("ABL vs SRC.");
    expect(lines.some((l) => l.startsWith("Stage: chart"))).toBe(true);
    expect(lines).toContain("Panel moa (prose): ATP-competitive inhibitor.");
    expect(lines).toContain("Caption stage: Lower is better.");
  });
  it("returns [] for non-object docs", () => {
    expect(flattenDoc(null)).toEqual([]);
    expect(flattenDoc("x")).toEqual([]);
  });
});

describe("diffLines", () => {
  it("marks unchanged, added, and removed lines", () => {
    const d = diffLines(["a", "b", "c"], ["a", "x", "c"]);
    expect(d.filter((l) => l.type === "same").map((l) => l.text)).toEqual(["a", "c"]);
    expect(d.find((l) => l.type === "remove")?.text).toBe("b");
    expect(d.find((l) => l.type === "add")?.text).toBe("x");
  });
  it("is empty-of-changes for identical inputs", () => {
    expect(diffStats(diffLines(["a", "b"], ["a", "b"]))).toEqual({ added: 0, removed: 0 });
  });
  it("counts pure additions and removals", () => {
    expect(diffStats(diffLines([], ["a", "b"]))).toEqual({ added: 2, removed: 0 });
    expect(diffStats(diffLines(["a", "b"], []))).toEqual({ added: 0, removed: 2 });
  });
});
