import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { authenticateWorker, type Verb, type WorkerId } from "./worker-auth";

// Distinct per-worker tokens (length-distinct so a constant-time compare can never cross-match).
const TOKENS: Record<WorkerId, string> = {
  scout: "scout-token-0000000000000000000000000000",
  editor: "editor-token-11111111111111111111111111111",
  keeper: "keeper-token-222222222222222222222222222222222",
};

// The verb scope each worker is granted (mirrors VERBS in worker-auth.ts).
const EXPECTED_VERBS: Record<WorkerId, Verb[]> = {
  scout: ["dedup", "create"],
  editor: ["dedup", "queue", "create", "update", "status", "resolve", "series", "flag"],
  keeper: ["targets", "update", "status", "flag"],
};

const ALL_VERBS: Verb[] = [
  "dedup",
  "queue",
  "create",
  "update",
  "status",
  "resolve",
  "series",
  "flag",
  "targets",
];

function reqWith(auth?: string): Request {
  return new Request("http://localhost/api/worker/artifacts", {
    headers: auth ? { authorization: auth } : {},
  });
}

describe("authenticateWorker", () => {
  beforeEach(() => {
    process.env.KNOVO_WORKER_TOKEN_SCOUT = TOKENS.scout;
    process.env.KNOVO_WORKER_TOKEN_EDITOR = TOKENS.editor;
    process.env.KNOVO_WORKER_TOKEN_KEEPER = TOKENS.keeper;
  });
  afterEach(() => {
    delete process.env.KNOVO_WORKER_TOKEN_SCOUT;
    delete process.env.KNOVO_WORKER_TOKEN_EDITOR;
    delete process.env.KNOVO_WORKER_TOKEN_KEEPER;
  });

  // Regression guard: all three workers — including Keeper, which was previously unreachable
  // because the auth loop only iterated scout/editor — must authenticate to their own identity.
  it.each((["scout", "editor", "keeper"] as WorkerId[]).map((id) => [id] as const))(
    "authenticates the %s token and grants exactly its verb scope",
    (id) => {
      const worker = authenticateWorker(reqWith(`Bearer ${TOKENS[id]}`));
      expect(worker).not.toBeNull();
      expect(worker!.id).toBe(id);
      for (const verb of EXPECTED_VERBS[id]) expect(worker!.can(verb)).toBe(true);
      for (const verb of ALL_VERBS.filter((v) => !EXPECTED_VERBS[id].includes(v))) {
        expect(worker!.can(verb)).toBe(false);
      }
    },
  );

  it("rejects a missing Authorization header", () => {
    expect(authenticateWorker(reqWith())).toBeNull();
  });

  it("rejects a malformed / non-bearer header", () => {
    expect(authenticateWorker(reqWith(TOKENS.scout))).toBeNull(); // no "Bearer " prefix
    expect(authenticateWorker(reqWith("Basic abc123"))).toBeNull();
  });

  it("rejects an unknown token", () => {
    expect(authenticateWorker(reqWith("Bearer definitely-not-a-configured-token"))).toBeNull();
  });

  it("does not match a worker whose token env var is unset", () => {
    delete process.env.KNOVO_WORKER_TOKEN_KEEPER;
    expect(authenticateWorker(reqWith(`Bearer ${TOKENS.keeper}`))).toBeNull();
  });

  it("accepts a lowercase bearer scheme (case-insensitive)", () => {
    expect(authenticateWorker(reqWith(`bearer ${TOKENS.editor}`))?.id).toBe("editor");
  });
});
