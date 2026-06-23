import { describe, it, expect } from "vitest";
import { parseSelection } from "./selection";

describe("parseSelection — supported subset", () => {
  it("parses a chain clause and upper-cases the id", () => {
    expect(parseSelection("chain A")).toEqual({ chain: "A" });
    expect(parseSelection("chain b")).toEqual({ chain: "B" });
  });

  it("parses a single residue", () => {
    expect(parseSelection("resi 45")).toEqual({ resi: [45] });
  });

  it("parses an inclusive residue range", () => {
    expect(parseSelection("resi 45-48")).toEqual({ resi: [45, 46, 47, 48] });
  });

  it("parses a comma list and a comma list of ranges + singletons", () => {
    expect(parseSelection("resi 1,3,5")).toEqual({ resi: [1, 3, 5] });
    expect(parseSelection("resi 1-3,7")).toEqual({ resi: [1, 2, 3, 7] });
  });

  it("dedupes overlapping residues, preserving first-seen order", () => {
    expect(parseSelection("resi 1-3,2-4")).toEqual({ resi: [1, 2, 3, 4] });
  });

  it("composes chain + resi with `and` (case-insensitive)", () => {
    expect(parseSelection("chain A and resi 45-46")).toEqual({ chain: "A", resi: [45, 46] });
    expect(parseSelection("RESI 1 AND CHAIN b")).toEqual({ chain: "B", resi: [1] });
  });

  it("tolerates irregular whitespace", () => {
    expect(parseSelection("  chain   A   and   resi 1-2 ")).toEqual({ chain: "A", resi: [1, 2] });
    expect(parseSelection("resi 1, 2")).toEqual({ resi: [1, 2] });
  });
});

describe("parseSelection — unparseable -> null", () => {
  it.each([
    ["", "empty string"],
    ["   ", "whitespace only"],
    ["chain", "keyword without value"],
    ["resi", "keyword without value"],
    ["chain A B", "two chain tokens"],
    ["resi abc", "non-integer residue"],
    ["resi 1.5", "fractional residue"],
    ["resi 5-2", "reversed range"],
    ["foo bar", "unknown keyword"],
    ["chain A and chain B", "conflicting duplicate chain"],
    ["resi 1 and resi 2", "conflicting duplicate resi"],
    ["chain A and", "trailing empty clause"],
    ["resi 1,", "trailing empty list entry"],
  ])("returns null for %j (%s)", (input) => {
    expect(parseSelection(input)).toBeNull();
  });
});
