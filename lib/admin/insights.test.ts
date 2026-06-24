import { describe, expect, it } from "vitest";
import {
  bucketByDay,
  flowCounts,
  formatDurationShort,
  formatPct,
  medianTimeToPublishMs,
  runStats,
  summarize,
  type InsightEvent,
  type InsightRun,
} from "./insights";

const NOW = new Date("2026-06-24T12:00:00Z").getTime();
const DAY = 24 * 60 * 60 * 1000;
const ev = (action: string, created_at: string, artifact_id: string | null = null): InsightEvent => ({
  action,
  created_at,
  artifact_id,
});

describe("flowCounts", () => {
  it("tallies pipeline + drop actions and ignores the rest", () => {
    const events = [
      ev("create_draft", "2026-06-24T01:00:00Z"),
      ev("create_draft", "2026-06-24T02:00:00Z"),
      ev("status:needs_review", "2026-06-24T03:00:00Z"),
      ev("status:published", "2026-06-24T04:00:00Z"),
      ev("status:rejected", "2026-06-24T05:00:00Z"),
      ev("status:archived", "2026-06-24T06:00:00Z"),
      ev("dedup_suppressed", "2026-06-24T07:00:00Z"),
      ev("dedup_suppressed", "2026-06-24T07:30:00Z"),
      ev("validation_rejected", "2026-06-24T08:00:00Z"),
      ev("flag:warn", "2026-06-24T09:00:00Z"),
      ev("flag:critical", "2026-06-24T09:30:00Z"),
      ev("update", "2026-06-24T10:00:00Z"), // ignored
      ev("comment:addressed", "2026-06-24T11:00:00Z"), // ignored
    ];
    expect(flowCounts(events)).toEqual({
      drafted: 2,
      review: 1,
      published: 1,
      rejected: 1,
      archived: 1,
      dedupSkipped: 2,
      validationRejected: 1,
      flags: 2,
    });
  });
});

describe("bucketByDay", () => {
  it("produces `days` UTC buckets oldest→newest with drafts/publishes counted", () => {
    const events = [
      ev("create_draft", "2026-06-24T01:00:00Z"),
      ev("create_draft", "2026-06-24T09:00:00Z"),
      ev("status:published", "2026-06-23T10:00:00Z"),
      ev("create_draft", "2026-06-20T10:00:00Z"), // outside a 3-day window
    ];
    const buckets = bucketByDay(events, 3, NOW);
    expect(buckets.map((b) => b.date)).toEqual(["2026-06-22", "2026-06-23", "2026-06-24"]);
    expect(buckets[2]).toEqual({ date: "2026-06-24", drafts: 2, publishes: 0 });
    expect(buckets[1]).toEqual({ date: "2026-06-23", drafts: 0, publishes: 1 });
    expect(buckets[0]).toEqual({ date: "2026-06-22", drafts: 0, publishes: 0 });
  });
  it("ignores unparseable timestamps", () => {
    const buckets = bucketByDay([ev("create_draft", "nonsense")], 2, NOW);
    expect(buckets.every((b) => b.drafts === 0)).toBe(true);
  });
});

describe("medianTimeToPublishMs", () => {
  it("pairs each artifact's earliest draft with its earliest publish and medians the gaps", () => {
    const events = [
      ev("create_draft", "2026-06-24T00:00:00Z", "a"),
      ev("status:published", "2026-06-24T02:00:00Z", "a"), // 2h
      ev("create_draft", "2026-06-24T00:00:00Z", "b"),
      ev("status:published", "2026-06-24T06:00:00Z", "b"), // 6h
      ev("create_draft", "2026-06-24T00:00:00Z", "c"), // never published → excluded
    ];
    expect(medianTimeToPublishMs(events)).toBe(4 * 60 * 60 * 1000); // median(2h, 6h) = 4h
  });
  it("returns null when nothing has both a draft and a publish", () => {
    expect(medianTimeToPublishMs([ev("create_draft", "2026-06-24T00:00:00Z", "a")])).toBeNull();
    expect(medianTimeToPublishMs([])).toBeNull();
  });
  it("takes the earliest publish and ignores republish after an edit", () => {
    const events = [
      ev("create_draft", "2026-06-24T00:00:00Z", "a"),
      ev("status:published", "2026-06-24T01:00:00Z", "a"),
      ev("status:published", "2026-06-24T09:00:00Z", "a"), // later republish ignored
    ];
    expect(medianTimeToPublishMs(events)).toBe(60 * 60 * 1000);
  });
});

describe("runStats", () => {
  const run = (status: string, worker = "scout"): InsightRun => ({ status, worker });
  it("counts dispatched vs failed and the success rate", () => {
    expect(runStats([run("dispatched"), run("dispatched"), run("failed")])).toEqual({
      total: 3,
      dispatched: 2,
      failed: 1,
      successRate: 2 / 3,
    });
  });
  it("treats any non-failed status as dispatched and handles no runs", () => {
    expect(runStats([run("dispatched")]).successRate).toBe(1);
    expect(runStats([])).toEqual({ total: 0, dispatched: 0, failed: 0, successRate: null });
  });
});

describe("summarize", () => {
  it("rolls up flow, throughput, drops, and run health with derived rates", () => {
    const events = [
      ev("create_draft", "2026-06-24T00:00:00Z", "a"),
      ev("status:published", "2026-06-24T03:00:00Z", "a"),
      ev("dedup_suppressed", "2026-06-24T04:00:00Z"),
      ev("validation_rejected", "2026-06-24T05:00:00Z"),
    ];
    const runs: InsightRun[] = [{ status: "dispatched", worker: "scout" }, { status: "failed", worker: "scout" }];
    const s = summarize(events, runs, 7, NOW);
    expect(s.flow.drafted).toBe(1);
    expect(s.createAttempts).toBe(3); // 1 drafted + 1 dedup + 1 validation
    expect(s.dedupRate).toBeCloseTo(1 / 3);
    expect(s.validationRate).toBeCloseTo(1 / 3);
    expect(s.medianTimeToPublishMs).toBe(3 * 60 * 60 * 1000);
    expect(s.throughput).toHaveLength(7);
    expect(s.runs).toEqual({ total: 2, dispatched: 1, failed: 1, successRate: 0.5 });
  });
  it("null rates when there were no create attempts", () => {
    const s = summarize([ev("status:published", "2026-06-24T01:00:00Z", "a")], [], 7, NOW);
    expect(s.dedupRate).toBeNull();
    expect(s.validationRate).toBeNull();
  });
});

describe("formatDurationShort", () => {
  it("renders the largest unit only", () => {
    expect(formatDurationShort(30 * 1000)).toBe("30s");
    expect(formatDurationShort(5 * 60 * 1000)).toBe("5m");
    expect(formatDurationShort(3 * 60 * 60 * 1000)).toBe("3h");
    expect(formatDurationShort(2 * DAY)).toBe("2d");
  });
  it("guards against negative/non-finite input", () => {
    expect(formatDurationShort(-1)).toBe("—");
    expect(formatDurationShort(Infinity)).toBe("—");
  });
});

describe("formatPct", () => {
  it("rounds a 0..1 rate to a percentage, or — for null", () => {
    expect(formatPct(0.1234)).toBe("12%");
    expect(formatPct(1)).toBe("100%");
    expect(formatPct(null)).toBe("—");
  });
});
