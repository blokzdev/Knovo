import { timingSafeEqual } from "crypto";

// Per-worker bearer-token auth for the governed Knovo API. Each routine worker holds a token
// (env, server-only) that maps to a worker identity and a fixed set of allowed verbs. This is
// the amended least-privilege model (Decision #4): scope is enforced by the API per worker,
// not by a shared DB role or the prompt.

export type WorkerId = "scout" | "editor";
export type Verb =
  | "dedup"
  | "queue"
  | "create"
  | "update"
  | "status"
  | "resolve"
  | "series";

const VERBS: Record<WorkerId, ReadonlySet<Verb>> = {
  // Scout discovers and drafts only.
  scout: new Set<Verb>(["dedup", "create"]),
  // Editor iterates, transitions, resolves directives, and curates series.
  editor: new Set<Verb>([
    "dedup",
    "queue",
    "create",
    "update",
    "status",
    "resolve",
    "series",
  ]),
};

function tokenFor(worker: WorkerId): string | undefined {
  return worker === "scout"
    ? process.env.KNOVO_WORKER_TOKEN_SCOUT
    : process.env.KNOVO_WORKER_TOKEN_EDITOR;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export type Worker = { id: WorkerId; can: (verb: Verb) => boolean };

// Resolve the Authorization bearer token to a worker identity (constant-time compare).
// Returns null when the header is missing or no configured token matches.
export function authenticateWorker(req: Request): Worker | null {
  const header = req.headers.get("authorization") ?? "";
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const presented = m[1].trim();
  for (const id of ["scout", "editor"] as const) {
    const expected = tokenFor(id);
    if (expected && expected.length > 0 && safeEqual(presented, expected)) {
      return { id, can: (verb: Verb) => VERBS[id].has(verb) };
    }
  }
  return null;
}
