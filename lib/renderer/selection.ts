// Pure parser for the molecular3d highlight `selection` grammar — a documented subset of the PDB
// selection language (see foundation/artifact-schema.md). Returns a 3Dmol AtomSelectionSpec subset
// or `null` when the selection is unparseable; the caller then skips that highlight rather than
// throwing. No 3Dmol import here, so this stays a pure, node-testable function.
//
// Supported v1 subset (whitespace-tolerant, composed with `and`, case-insensitive keywords):
//   chain X                -> { chain: "X" }            (chain id upper-cased)
//   resi N                 -> { resi: [N] }
//   resi N-M               -> { resi: [N..M] }          (inclusive range)
//   resi N,M               -> { resi: [N, M] }          (comma list; entries may be ranges)
//   chain X and resi N-M   -> { chain: "X", resi: [...] }
// Anything else (unknown keyword, non-integer resi, reversed range like 5-2, duplicate key) -> null.

export type AtomSelectionSpec = { chain?: string; resi?: number[] };

// Parse a `resi` value list (already whitespace-stripped): a comma-separated list of integers
// and/or inclusive `N-M` ranges. Returns deduped residue numbers in first-seen order, or null.
function parseResiList(rest: string): number[] | null {
  const out: number[] = [];
  const seen = new Set<number>();
  const push = (n: number) => {
    if (!seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  };
  for (const token of rest.split(",")) {
    if (token === "") return null;
    const range = token.match(/^(\d+)-(\d+)$/);
    if (range) {
      const lo = Number(range[1]);
      const hi = Number(range[2]);
      if (hi < lo) return null;
      for (let i = lo; i <= hi; i++) push(i);
      continue;
    }
    if (/^\d+$/.test(token)) {
      push(Number(token));
      continue;
    }
    return null; // non-integer / malformed token
  }
  return out.length > 0 ? out : null;
}

export function parseSelection(sel: string): AtomSelectionSpec | null {
  if (typeof sel !== "string") return null;
  const normalized = sel.trim().replace(/\s+/g, " ");
  if (normalized === "") return null;

  const spec: AtomSelectionSpec = {};
  for (const raw of normalized.split(/ and /i)) {
    const clause = raw.trim();
    const spaceIdx = clause.indexOf(" ");
    if (spaceIdx === -1) return null; // every clause must be "keyword rest"
    const keyword = clause.slice(0, spaceIdx).toLowerCase();
    const rest = clause.slice(spaceIdx + 1).trim();
    if (rest === "") return null;

    if (keyword === "chain") {
      if (/\s/.test(rest)) return null; // "chain A B" is invalid
      if (spec.chain !== undefined) return null; // duplicate chain clause
      spec.chain = rest.toUpperCase();
    } else if (keyword === "resi") {
      if (spec.resi !== undefined) return null; // duplicate resi clause
      const resi = parseResiList(rest.replace(/\s+/g, "")); // tolerate "resi 1, 2"
      if (!resi) return null;
      spec.resi = resi;
    } else {
      return null; // unknown keyword
    }
  }

  return Object.keys(spec).length > 0 ? spec : null;
}
