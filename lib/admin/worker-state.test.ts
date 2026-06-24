import { describe, expect, it } from "vitest";
import { deriveWorkerStatus, statusLabel, settingsHref, type LastRun } from "./worker-state";

const run = (over: Partial<NonNullable<LastRun>> = {}): LastRun => ({
  status: "dispatched",
  started_at: "2026-06-24T10:00:00Z",
  session_url: "https://claude.ai/s/r1",
  error: null,
  ...over,
});

describe("deriveWorkerStatus", () => {
  it("source 'none' → setup, not dispatchable, regardless of any run", () => {
    const s = deriveWorkerStatus({ source: "none", fireUrlValid: false }, null);
    expect(s).toMatchObject({ state: "setup", active: false, canDispatch: false, reason: null });
  });

  it("configured but invalid fire URL → issue, not dispatchable (db)", () => {
    const s = deriveWorkerStatus({ source: "db", fireUrlValid: false }, run());
    expect(s.state).toBe("issue");
    expect(s.canDispatch).toBe(false);
    expect(s.reason).toMatch(/valid Claude API URL/);
  });

  it("invalid URL wins over a failed run (precedence) and stays non-dispatchable", () => {
    const s = deriveWorkerStatus({ source: "db", fireUrlValid: false }, run({ status: "failed", error: "boom" }));
    expect(s.state).toBe("issue");
    expect(s.canDispatch).toBe(false);
    expect(s.reason).toMatch(/valid Claude API URL/); // the URL reason, not the run error
  });

  it("env source with an invalid URL is flagged too (not silently 'ready')", () => {
    const s = deriveWorkerStatus({ source: "env", fireUrlValid: false }, null);
    expect(s.state).toBe("issue");
    expect(s.canDispatch).toBe(false);
  });

  it("valid URL + failed last dispatch → issue, but retryable, surfacing the run error", () => {
    const s = deriveWorkerStatus(
      { source: "db", fireUrlValid: true },
      run({ status: "failed", error: "Firing routine 'keeper' failed (404): DEPLOYMENT_NOT_FOUND" }),
    );
    expect(s.state).toBe("issue");
    expect(s.canDispatch).toBe(true);
    expect(s.reason).toMatch(/404/);
  });

  it("failed run with no error string falls back to a generic reason", () => {
    const s = deriveWorkerStatus({ source: "env", fireUrlValid: true }, run({ status: "failed", error: null }));
    expect(s).toMatchObject({ state: "issue", canDispatch: true, reason: "Last dispatch failed." });
  });

  it("configured + a successful run → ready, active, dispatchable", () => {
    const s = deriveWorkerStatus({ source: "db", fireUrlValid: true }, run());
    expect(s).toMatchObject({ state: "ready", active: true, canDispatch: true });
    expect(s.lastRunAt).toBe("2026-06-24T10:00:00Z");
    expect(s.sessionUrl).toBe("https://claude.ai/s/r1");
  });

  it("configured with no runs yet → ready but not active (wired, never run)", () => {
    const s = deriveWorkerStatus({ source: "env", fireUrlValid: true }, null);
    expect(s).toMatchObject({ state: "ready", active: false, canDispatch: true });
  });

  it("a non-'failed' run status (e.g. 'dispatched') is treated as healthy/active", () => {
    const s = deriveWorkerStatus({ source: "db", fireUrlValid: true }, run({ status: "dispatched" }));
    expect(s.state).toBe("ready");
    expect(s.active).toBe(true);
  });
});

describe("statusLabel", () => {
  const base = { source: "db" as const, lastRunAt: null, sessionUrl: null, reason: null, canDispatch: true };
  it("splits ready into Active / Ready by run history", () => {
    expect(statusLabel({ ...base, state: "ready", active: true })).toBe("Active");
    expect(statusLabel({ ...base, state: "ready", active: false })).toBe("Ready");
  });
  it("uses the state meta label otherwise", () => {
    expect(statusLabel({ ...base, state: "setup", active: false, canDispatch: false })).toBe("Needs setup");
    expect(statusLabel({ ...base, state: "issue", active: false })).toBe("Issue");
  });
});

describe("settingsHref", () => {
  it("deep-links to the worker's settings tab", () => {
    expect(settingsHref("keeper")).toBe("/admin/settings?worker=keeper");
  });
});
