import { describe, expect, it } from "vitest";
import { timeAgo } from "./utils";

const NOW = new Date("2026-06-24T12:00:00Z").getTime();
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe("timeAgo", () => {
  it("buckets recent times into compact units", () => {
    expect(timeAgo(ago(10_000), NOW)).toBe("just now");
    expect(timeAgo(ago(5 * 60_000), NOW)).toBe("5m");
    expect(timeAgo(ago(3 * 3_600_000), NOW)).toBe("3h");
    expect(timeAgo(ago(2 * 86_400_000), NOW)).toBe("2d");
  });
  it("falls back to a short date past a week", () => {
    expect(timeAgo(ago(30 * 86_400_000), NOW)).toMatch(/\w{3}\s\d+/);
  });
  it("returns empty string for an invalid date", () => {
    expect(timeAgo("not-a-date", NOW)).toBe("");
  });
});
