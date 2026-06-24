import { describe, expect, it } from "vitest";
import { computeHealth, isOverdue, waitDays, type HealthInput } from "./health";

const NOW = new Date("2026-06-24T12:00:00Z").getTime();
const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(NOW - days * DAY).toISOString();

const base: HealthInput = {
  now: NOW,
  reviewItems: [],
  failedWorkers: [],
  createAttempts: 0,
  dedupSkipped: 0,
  validationRejected: 0,
};

describe("waitDays / isOverdue", () => {
  it("counts whole days waited and flags >= 3 days as overdue", () => {
    expect(waitDays(ago(0), NOW)).toBe(0);
    expect(waitDays(ago(2.9), NOW)).toBe(2);
    expect(isOverdue(ago(2), NOW)).toBe(false);
    expect(isOverdue(ago(3), NOW)).toBe(true);
  });
  it("treats future / unparseable timestamps as 0", () => {
    expect(waitDays(new Date(NOW + DAY).toISOString(), NOW)).toBe(0);
    expect(waitDays("nope", NOW)).toBe(0);
  });
});

describe("computeHealth", () => {
  it("returns no alerts when everything is fresh and healthy", () => {
    expect(computeHealth({ ...base, reviewItems: [{ updated_at: ago(1) }] })).toEqual([]);
  });

  it("flags overdue reviews, escalating to critical past a week, with the oldest age", () => {
    const warn = computeHealth({ ...base, reviewItems: [{ updated_at: ago(4) }, { updated_at: ago(1) }] });
    expect(warn).toHaveLength(1);
    expect(warn[0]).toMatchObject({ kind: "stale_review", severity: "warn" });
    expect(warn[0].title).toMatch(/1 draft awaiting review/);
    expect(warn[0].detail).toMatch(/4 days/);

    const crit = computeHealth({ ...base, reviewItems: [{ updated_at: ago(9) }, { updated_at: ago(4) }] });
    expect(crit[0]).toMatchObject({ kind: "stale_review", severity: "critical" });
    expect(crit[0].title).toMatch(/2 drafts awaiting review/);
    expect(crit[0].detail).toMatch(/9 days/);
  });

  it("flags each worker whose last run failed, linking to its settings tab", () => {
    const a = computeHealth({ ...base, failedWorkers: ["keeper"] });
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ kind: "run_failed", href: "/admin/settings?worker=keeper" });
    expect(a[0].title).toMatch(/Keeper/);
  });

  it("flags a validation-failure spike above threshold, but not below the minimum sample", () => {
    // 2/4 = 50% > 25%, sample met
    const hit = computeHealth({ ...base, createAttempts: 4, validationRejected: 2 });
    expect(hit.find((x) => x.kind === "validation_spike")).toBeTruthy();
    // 1/2 = 50% but only 2 attempts → below min sample → no alert
    const small = computeHealth({ ...base, createAttempts: 2, validationRejected: 1 });
    expect(small.find((x) => x.kind === "validation_spike")).toBeFalsy();
  });

  it("flags a dedup spike above 50%", () => {
    const hit = computeHealth({ ...base, createAttempts: 10, dedupSkipped: 6 });
    expect(hit.find((x) => x.kind === "dedup_spike")).toBeTruthy();
    const ok = computeHealth({ ...base, createAttempts: 10, dedupSkipped: 4 });
    expect(ok.find((x) => x.kind === "dedup_spike")).toBeFalsy();
  });

  it("orders critical alerts before warnings", () => {
    const alerts = computeHealth({
      ...base,
      reviewItems: [{ updated_at: ago(10) }], // critical
      failedWorkers: ["scout"], // warn
    });
    expect(alerts[0].severity).toBe("critical");
    expect(alerts.map((a) => a.kind)).toEqual(["stale_review", "run_failed"]);
  });
});
