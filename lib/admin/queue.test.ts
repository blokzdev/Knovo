import { describe, expect, it } from "vitest";
import { isActionableDirective, laneFor, splitArtifactsIntoLanes, LANE_ORDER } from "./queue";
import type { Status } from "./labels";

describe("isActionableDirective", () => {
  it("is actionable with an action or the publish-after flag, not a plain note", () => {
    expect(isActionableDirective({ action: "revise", publish_after: false })).toBe(true);
    expect(isActionableDirective({ action: null, publish_after: true })).toBe(true);
    expect(isActionableDirective({ action: null, publish_after: false })).toBe(false);
  });
});

describe("laneFor", () => {
  it("maps lifecycle statuses to their lane", () => {
    expect(laneFor("draft")).toBe("incoming");
    expect(laneFor("needs_review")).toBe("in_review");
    expect(laneFor("changes_requested")).toBe("in_review");
    expect(laneFor("approved")).toBe("ready");
  });
  it("returns null for statuses that leave the active queue", () => {
    expect(laneFor("published")).toBeNull();
    expect(laneFor("archived")).toBeNull();
    expect(laneFor("rejected")).toBeNull();
  });
});

describe("splitArtifactsIntoLanes", () => {
  const a = (id: string, status: Status) => ({ id, status });
  it("groups artifacts into lanes, dropping out-of-queue statuses, preserving order", () => {
    const lanes = splitArtifactsIntoLanes([
      a("1", "draft"),
      a("2", "needs_review"),
      a("3", "published"), // dropped
      a("4", "changes_requested"),
      a("5", "approved"),
      a("6", "draft"),
      a("7", "archived"), // dropped
    ]);
    expect(lanes.incoming.map((x) => x.id)).toEqual(["1", "6"]);
    expect(lanes.in_review.map((x) => x.id)).toEqual(["2", "4"]);
    expect(lanes.ready.map((x) => x.id)).toEqual(["5"]);
  });
  it("returns all three lanes even when empty", () => {
    const lanes = splitArtifactsIntoLanes([]);
    expect(Object.keys(lanes).sort()).toEqual([...LANE_ORDER].sort());
    expect(lanes.incoming).toEqual([]);
  });
});
