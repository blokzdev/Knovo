// Flatten a slot artifact document to human-readable lines, and compute a line-level diff between
// two versions. Used by the Revisions tab to show what a revision changed vs. the current doc and to
// preview a restore. Pure + dependency-free (an LCS line diff) so it's testable and server-safe.

type AnyDoc = Record<string, unknown> & {
  title?: unknown;
  summary?: unknown;
  stage?: Record<string, unknown>;
  panels?: Record<string, unknown>[];
  controls?: Record<string, unknown>[];
  captions?: Record<string, unknown>[];
};

const str = (v: unknown): string => (v == null ? "" : String(v));

export function flattenDoc(doc: unknown): string[] {
  if (!doc || typeof doc !== "object") return [];
  const d = doc as AnyDoc;
  const lines: string[] = [];
  if (d.title) lines.push(`# ${str(d.title)}`);
  if (d.summary) lines.push(str(d.summary));

  const stage = d.stage;
  if (stage && typeof stage === "object") {
    const kind = str(stage.kind);
    lines.push(`Stage: ${kind}`);
    if (kind === "molecular3d") {
      const src = stage.source as { db?: unknown; uid?: unknown } | undefined;
      if (src) lines.push(`Source: ${str(src.db)} ${str(src.uid)}`);
      for (const h of (stage.highlights as Record<string, unknown>[] | undefined) ?? [])
        lines.push(`Highlight ${str(h.id)}: ${str(h.selection)} (${str(h.color)})`);
    } else if (kind === "chart") {
      const axes = stage.axes as { x?: unknown; y?: unknown } | undefined;
      lines.push(`Chart: ${str(stage.chartType)} — ${str(axes?.x)} vs ${str(axes?.y)}`);
      for (const s of (stage.series as Record<string, unknown>[] | undefined) ?? [])
        lines.push(`Series ${str(s.name)}: ${((s.data as unknown[]) ?? []).length} points`);
    }
  }

  for (const p of d.panels ?? []) {
    const kind = str(p.kind);
    if (kind === "prose") lines.push(`Panel ${str(p.id)} (prose): ${str(p.content)}`);
    else if (kind === "keyvalue")
      for (const kv of (p.content as Record<string, unknown>[] | undefined) ?? [])
        lines.push(`Panel ${str(p.id)}: ${str(kv.k)} = ${str(kv.v)}`);
    else if (kind === "figure") {
      const c = p.content as { alt?: unknown } | undefined;
      lines.push(`Panel ${str(p.id)} (figure): ${str(c?.alt)}`);
    }
  }
  for (const c of d.controls ?? []) lines.push(`Control ${str(c.id)}: ${str(c.label)} → ${str(c.param)}`);
  for (const c of d.captions ?? []) lines.push(`Caption ${str(c.target)}: ${str(c.text)}`);

  // Split embedded newlines so prose diffs at line granularity.
  return lines.flatMap((l) => l.split("\n"));
}

export type DiffLine = { type: "same" | "add" | "remove"; text: string };

// Standard LCS line diff. O(n·m) — fine for artifact docs (tens of lines).
export function diffLines(before: string[], after: string[]): DiffLine[] {
  const n = before.length;
  const m = after.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = before[i] === after[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (before[i] === after[j]) {
      out.push({ type: "same", text: before[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "remove", text: before[i] });
      i++;
    } else {
      out.push({ type: "add", text: after[j] });
      j++;
    }
  }
  while (i < n) out.push({ type: "remove", text: before[i++] });
  while (j < m) out.push({ type: "add", text: after[j++] });
  return out;
}

export function diffStats(lines: DiffLine[]): { added: number; removed: number } {
  return {
    added: lines.filter((l) => l.type === "add").length,
    removed: lines.filter((l) => l.type === "remove").length,
  };
}
