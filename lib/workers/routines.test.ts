import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { WORKER_ROUTINES, WORKER_ORDER } from "./routines";

// Drift guard: docs/routines.md is the canonical source for the worker routine prompts. This test
// asserts each registry `instructions` block is byte-for-byte identical to its PASTE-READY block in
// the doc, so the in-app copy (admin settings) can never silently drift from the canonical text.
function pasteReadyBlocks(): string[] {
  // Normalize CRLF→LF before matching: on a Windows checkout (core.autocrlf) the working-tree
  // copy of docs/routines.md is CRLF, but this LF-anchored regex would then match zero blocks.
  // .gitattributes pins these files to LF at the repo level; this keeps the guard correct even if
  // a working tree slips back to CRLF.
  const md = readFileSync(resolve(process.cwd(), "docs/routines.md"), "utf8").replace(/\r\n/g, "\n");
  const re = /### ▶ PASTE-READY[^\n]*\n```\n([\s\S]*?)\n```/g;
  const blocks: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(md))) blocks.push(m[1].trim());
  return blocks;
}

describe("worker routines registry ⇄ docs/routines.md", () => {
  const blocks = pasteReadyBlocks();

  it("has exactly one PASTE-READY block per worker, in order", () => {
    expect(blocks).toHaveLength(WORKER_ORDER.length);
    expect(WORKER_ORDER).toEqual(["scout", "editor", "keeper"]);
  });

  it.each(WORKER_ORDER.map((id, i) => [id, i] as const))(
    "%s instructions match the doc's PASTE-READY block",
    (id, i) => {
      expect(WORKER_ROUTINES[id].instructions.replace(/\r\n/g, "\n").trim()).toBe(blocks[i]);
    },
  );

  it("every worker carries non-empty meta", () => {
    for (const id of WORKER_ORDER) {
      const w = WORKER_ROUTINES[id];
      expect(w.instructions.length).toBeGreaterThan(0);
      expect(w.routineName).toContain("Knovo");
      expect(w.connectorsKeep.length).toBeGreaterThan(0);
      expect(w.scopes.length).toBeGreaterThan(0);
      expect(w.envToken).toMatch(/^KNOVO_WORKER_TOKEN_/);
    }
  });
});
