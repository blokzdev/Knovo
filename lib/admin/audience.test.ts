import { describe, expect, it } from "vitest";
import { summarizeAudience, type AudienceViewRow } from "./audience";

const NOW = new Date("2026-06-26T12:00:00Z").getTime();
const row = (
  artifact_id: string,
  day: string,
  visitor_hash: string,
  hits = 1,
): AudienceViewRow => ({ artifact_id, day, visitor_hash, hits });

describe("summarizeAudience", () => {
  it("returns an empty, well-formed summary with no rows", () => {
    const s = summarizeAudience([], 14, NOW);
    expect(s.totalViews).toBe(0);
    expect(s.uniqueReaders).toBe(0);
    expect(s.returningReaders).toBe(0);
    expect(s.returnRate).toBeNull();
    expect(s.topArtifacts).toEqual([]);
    expect(s.perDay).toHaveLength(14);
    expect(s.perDay.every((d) => d.views === 0 && d.readers === 0)).toBe(true);
    // window is oldest → newest, ending today (UTC)
    expect(s.perDay[13].date).toBe("2026-06-26");
    expect(s.perDay[0].date).toBe("2026-06-13");
  });

  it("counts views as sum(hits) and unique readers as distinct hashes", () => {
    const rows = [
      row("a", "2026-06-26", "h1", 3), // one reader, 3 views
      row("a", "2026-06-26", "h2", 1), // another reader
    ];
    const s = summarizeAudience(rows, 14, NOW);
    expect(s.totalViews).toBe(4);
    expect(s.uniqueReaders).toBe(2);
    expect(s.returningReaders).toBe(0); // both only one day
  });

  it("flags a returning reader as one seen on >= 2 distinct days", () => {
    const rows = [
      row("a", "2026-06-24", "h1"),
      row("a", "2026-06-26", "h1"), // h1 came back on a second day
      row("a", "2026-06-26", "h2"), // h2 only once
    ];
    const s = summarizeAudience(rows, 14, NOW);
    expect(s.uniqueReaders).toBe(2);
    expect(s.returningReaders).toBe(1);
    expect(s.returnRate).toBeCloseTo(0.5, 5);
  });

  it("does not double-count the same hash across artifacts when measuring readers/returns", () => {
    const rows = [
      row("a", "2026-06-24", "h1"),
      row("b", "2026-06-26", "h1"), // same person, two artifacts, two days
    ];
    const s = summarizeAudience(rows, 14, NOW);
    expect(s.uniqueReaders).toBe(1);
    expect(s.returningReaders).toBe(1); // distinct days regardless of artifact
  });

  it("ranks top artifacts by views then readers and respects topN", () => {
    const rows = [
      row("a", "2026-06-26", "h1", 5),
      row("b", "2026-06-26", "h2", 2),
      row("b", "2026-06-26", "h3", 2),
      row("c", "2026-06-26", "h4", 1),
    ];
    const s = summarizeAudience(rows, 14, NOW, 2);
    expect(s.topArtifacts).toHaveLength(2);
    expect(s.topArtifacts[0]).toEqual({ artifactId: "a", views: 5, readers: 1 });
    expect(s.topArtifacts[1]).toEqual({ artifactId: "b", views: 4, readers: 2 });
  });

  it("buckets per-day views/readers and ignores rows outside the window for the chart", () => {
    const rows = [
      row("a", "2026-06-26", "h1", 2),
      row("a", "2026-06-26", "h2", 1),
      row("a", "2026-06-25", "h1", 1),
      row("a", "2026-01-01", "h9", 1), // far outside the 14-day chart window
    ];
    const s = summarizeAudience(rows, 14, NOW);
    const today = s.perDay[13];
    const yesterday = s.perDay[12];
    expect(today.date).toBe("2026-06-26");
    expect(today.views).toBe(3);
    expect(today.readers).toBe(2);
    expect(yesterday.date).toBe("2026-06-25");
    expect(yesterday.views).toBe(1);
    expect(yesterday.readers).toBe(1);
    // The far-past row is excluded from the per-day chart but still counts in window totals.
    expect(s.perDay.reduce((n, d) => n + d.views, 0)).toBe(4);
    expect(s.totalViews).toBe(5);
  });

  it("counts distinct hashes as distinct readers (why the caller must scope to one salt window)", () => {
    // The same physical person gets a fresh hash in each 7-day salt window, so passing rows from
    // two windows would over-count them. This documents the contract the Insights page upholds by
    // fetching exactly the salt window (AUDIENCE_DAYS): within-window dedup works, cross-window can't.
    const rows = [
      row("a", "2026-06-20", "week1hash"), // same person, salt window 1
      row("a", "2026-06-26", "week2hash"), // same person, salt window 2 → different hash
    ];
    const s = summarizeAudience(rows, 7, NOW);
    expect(s.uniqueReaders).toBe(2); // cannot be deduped across windows — by privacy design
    expect(s.returningReaders).toBe(0); // neither hash spans 2 days
  });

  it("treats non-positive hits defensively as zero views", () => {
    const s = summarizeAudience([row("a", "2026-06-26", "h1", 0)], 14, NOW);
    expect(s.totalViews).toBe(0);
    expect(s.uniqueReaders).toBe(1); // the reader is still counted
  });
});
