import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Shared helpers + transition policy for the governed worker API. The policy here is the
// human-directed publish gate (amended Decision #2): workers may move content through the
// workflow freely, but turning content public — or editing/archiving already-public content —
// requires an admin **directive** (an open comment cue set in the dashboard).

export type Db = SupabaseClient<Database>;
export type Status = Database["public"]["Enums"]["artifact_status"];
export type DirectiveAction = Database["public"]["Enums"]["directive_action"];

// A directive is two axes: an optional action (what to do) and a publish_after flag (whether to
// publish when done). An "actionable" directive has an action OR is flagged publish_after.
export type OpenDirective = { action: DirectiveAction | null; publish_after: boolean };

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}
export function err(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "artifact";
}

// Resolve a unique slug for a new artifact (append a short suffix on collision).
export async function uniqueSlug(db: Db, base: string): Promise<string> {
  const root = slugify(base);
  const { data } = await db
    .from("artifacts")
    .select("slug")
    .like("slug", `${root}%`);
  const taken = new Set((data ?? []).map((r) => r.slug));
  if (!taken.has(root)) return root;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${root}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

// Open, actionable admin directives currently attached to an artifact (an action OR publish_after).
export async function openDirectives(db: Db, artifactId: string): Promise<OpenDirective[]> {
  const { data } = await db
    .from("comments")
    .select("action, publish_after")
    .eq("artifact_id", artifactId)
    .eq("status", "open");
  return (data ?? [])
    .map((r) => ({ action: r.action, publish_after: r.publish_after }))
    .filter((d) => d.action !== null || d.publish_after);
}

// Snapshot the artifact's current doc into revision history before a content write.
export async function snapshotRevision(
  db: Db,
  artifact: { id: string; schema_version: number; doc: unknown; title: string; summary: string | null },
  createdBy: string,
  note?: string,
) {
  await db.from("revisions").insert({
    artifact_id: artifact.id,
    schema_version: artifact.schema_version,
    doc: artifact.doc as Database["public"]["Tables"]["revisions"]["Insert"]["doc"],
    title: artifact.title,
    summary: artifact.summary,
    note: note ?? null,
    created_by: createdBy,
  });
}

export async function audit(
  db: Db,
  actor: string,
  action: string,
  artifactId: string | null,
  detail?: Record<string, unknown>,
) {
  await db.from("audit_log").insert({
    actor,
    action,
    artifact_id: artifactId,
    detail: (detail ?? null) as Database["public"]["Tables"]["audit_log"]["Insert"]["detail"],
  });
}

// ── Transition policy ────────────────────────────────────────────────────────
// Status targets a worker may set at all (admin owns approved/changes_requested/rejected).
const WORKER_TARGETS: ReadonlySet<Status> = new Set<Status>([
  "needs_review",
  "published",
  "archived",
]);
export function isWorkerTransitionAllowed(to: Status): boolean {
  return WORKER_TARGETS.has(to);
}

// Publishing requires the human gate: admin-'approved', or an open directive flagged publish_after.
export function publishAuthorized(current: Status, directives: OpenDirective[]): boolean {
  return current === "approved" || directives.some((d) => d.publish_after);
}

// Capability groups — keep the per-action policy in one place so new actions slot in cleanly.
// EDIT actions change the document; SERIES actions curate collections.
export const EDIT_ACTIONS: ReadonlySet<DirectiveAction> = new Set<DirectiveAction>([
  "revise",
  "expand",
  "condense",
  "reverify",
  "split",
]);
export const SERIES_ACTIONS: ReadonlySet<DirectiveAction> = new Set<DirectiveAction>([
  "make_series",
  "add_to_series",
]);

// Editing already-published content requires an open content directive (the admin asked for it).
export function editLiveAuthorized(directives: OpenDirective[]): boolean {
  return directives.some((d) => d.action !== null && EDIT_ACTIONS.has(d.action));
}
export function archiveLiveAuthorized(directives: OpenDirective[]): boolean {
  return directives.some((d) => d.action === "archive");
}
