import { describe, expect, it } from "vitest";
import { describeAction, parseActor, parseAuditDetail } from "./activity";

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
    ["reader_comment:hidden", "Moderated comment", "moderate"],
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
