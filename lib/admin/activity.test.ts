import { describe, expect, it } from "vitest";
import {
  describeAction,
  groupActivityIntoRuns,
  parseActor,
  parseAuditDetail,
  type ActivityEvent,
  type RunRow,
} from "./activity";

describe("parseActor", () => {
  it("resolves each worker to its label + tone", () => {
    expect(parseActor("worker:scout")).toMatchObject({ kind: "worker", worker: "scout", label: "Scout", tone: "sky" });
    expect(parseActor("worker:editor")).toMatchObject({ kind: "worker", worker: "editor", label: "Editor" });
    expect(parseActor("worker:keeper")).toMatchObject({ kind: "worker", worker: "keeper", label: "Keeper" });
  });
  it("resolves an admin actor to its uuid", () => {
    expect(parseActor("admin:b69fbc87-18ac-4301-b01b-cd7d38e67703")).toEqual({
      kind: "admin",
      id: "b69fbc87-18ac-4301-b01b-cd7d38e67703",
    });
  });
  it("falls back to System for unknown / empty / malformed actors", () => {
    expect(parseActor(null).kind).toBe("system");
    expect(parseActor("").kind).toBe("system");
    expect(parseActor("worker:ghost").kind).toBe("system");
    expect(parseActor("seed:demo").kind).toBe("system");
  });
});

describe("describeAction", () => {
  it.each([
    ["create_draft", "Drafted", "draft"],
    ["update", "Edited content", "edit"],
    ["status:needs_review", "Sent for review", "review"],
    ["status:changes_requested", "Requested changes", "changes"],
    ["status:approved", "Approved", "approve"],
    ["status:published", "Published", "publish"],
    ["status:rejected", "Rejected", "reject"],
    ["status:archived", "Archived", "archive"],
    ["comment", "Commented", "comment"],
    ["comment:addressed", "Marked addressed", "addressed"],
    ["comment:dismissed", "Dismissed", "dismissed"],
    ["directive:revise", "Directed: Revise", "directive"],
    ["directive:reverify", "Directed: Re-verify sources", "directive"],
    ["dispatch:scout", "Dispatched Scout", "dispatch"],
    ["dispatch:editor", "Dispatched Editor", "dispatch"],
    ["restore_revision", "Restored a version", "restoreRevision"],
    ["soft_delete", "Moved to trash", "trash"],
    ["restore", "Restored from trash", "untrash"],
    ["flag:warn", "Flagged (warn)", "flag"],
    ["reader_comment:removed", "Removed comment", "moderate"],
    ["reader_comment:hidden", "Hidden comment", "moderate"],
    ["reader_comment:visible", "Restored comment", "moderate"],
    ["series_create", "Created series", "directive"],
    ["series_attach", "Added to series", "directive"],
    ["config:routine:editor", "Updated config", "config"],
  ] as const)("maps %s → %s", (action, label, icon) => {
    const info = describeAction(action);
    expect(info.label).toBe(label);
    expect(info.icon).toBe(icon);
    expect(info.tone).toBeTruthy();
  });

  it("degrades unknown tokens to a neutral chip showing the raw token", () => {
    expect(describeAction("brand_new_verb")).toEqual({ label: "brand_new_verb", tone: "zinc", icon: "unknown" });
    expect(describeAction("status:weird")).toMatchObject({ icon: "unknown" });
  });

  it("flag severity drives the tone", () => {
    expect(describeAction("flag:critical").tone).toBe("red");
    expect(describeAction("flag:info").tone).toBe("sky");
  });
});

describe("parseAuditDetail", () => {
  it("extracts known fields and ignores junk", () => {
    expect(
      parseAuditDetail({ from: "approved", reason: "off scope", changed: ["title", 7], session: "s_1", evil: {} }),
    ).toEqual({ from: "approved", reason: "off scope", changed: ["title"], session: "s_1" });
  });
  it("tolerates null / non-object detail", () => {
    expect(parseAuditDetail(null)).toEqual({});
    expect(parseAuditDetail("nope")).toEqual({});
    expect(parseAuditDetail(undefined)).toEqual({});
  });
  it("preserves explicit null reason/note", () => {
    expect(parseAuditDetail({ reason: null, note: null })).toMatchObject({ reason: null, note: null });
  });
});

describe("groupActivityIntoRuns", () => {
  const run = (id: string, worker: string, started_at: string): RunRow => ({
    id,
    worker,
    status: "dispatched",
    session_url: `https://claude.ai/s/${id}`,
    started_at,
  });
  const ev = (id: string, actor: string, action: string, created_at: string, run_id?: string): ActivityEvent => ({
    id,
    actor,
    action,
    created_at,
    run_id: run_id ?? null,
  });

  it("groups a worker's events (and the dispatch) under its run, leaving admin events loose", () => {
    const runs = [run("r1", "editor", "2026-06-24T02:05:00Z")];
    // newest-first, as rendered
    const events = [
      ev("e5", "worker:editor", "status:published", "2026-06-24T02:07:00Z"),
      ev("e4", "worker:editor", "update", "2026-06-24T02:06:00Z"),
      ev("e3", "admin:x", "dispatch:editor", "2026-06-24T02:05:00Z", "r1"),
      ev("e2", "admin:x", "directive:revise", "2026-06-24T02:04:00Z"),
      ev("e1", "worker:scout", "create_draft", "2026-06-24T01:57:00Z"),
    ];
    const groups = groupActivityIntoRuns(events, runs);
    expect(groups).toHaveLength(2);
    expect(groups[0].run?.id).toBe("r1");
    expect(groups[0].rows.map((r) => r.id)).toEqual(["e5", "e4", "e3"]);
    expect(groups[1].run).toBeNull();
    expect(groups[1].rows.map((r) => r.id)).toEqual(["e2", "e1"]); // scout has no run → loose
  });

  it("attaches each worker event to the correct run when the same worker runs twice", () => {
    const runs = [run("r1", "editor", "2026-06-24T02:05:00Z"), run("r2", "editor", "2026-06-24T03:00:00Z")];
    const events = [
      ev("b", "worker:editor", "update", "2026-06-24T03:05:00Z"),
      ev("a", "worker:editor", "update", "2026-06-24T02:06:00Z"),
    ];
    const groups = groupActivityIntoRuns(events, runs);
    expect(groups.map((g) => g.run?.id)).toEqual(["r2", "r1"]);
  });

  it("does not attach a worker event more than the window after its run started", () => {
    const runs = [run("r1", "editor", "2026-06-24T02:05:00Z")];
    const events = [ev("late", "worker:editor", "update", "2026-06-24T12:00:00Z")];
    expect(groupActivityIntoRuns(events, runs)[0].run).toBeNull();
  });
});
