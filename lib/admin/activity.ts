import { ACTION_LABELS, WORKER_META, type DirectiveAction, type Tone, type WorkerId } from "./labels";

// Pure, presentation-agnostic vocabulary for the admin activity surfaces. Maps the machine tokens
// stored in audit_log.actor / audit_log.action into human labels, tones, and icon KEYS (the React
// icon components are resolved in the component layer so this stays a pure, testable data module).

export type IconKey =
  | "draft"
  | "edit"
  | "review"
  | "changes"
  | "approve"
  | "publish"
  | "reject"
  | "archive"
  | "directive"
  | "comment"
  | "addressed"
  | "dismissed"
  | "dispatch"
  | "restoreRevision"
  | "trash"
  | "untrash"
  | "moderate"
  | "config"
  | "flag"
  | "unknown";

// ── Actors ──────────────────────────────────────────────────────────────────
export type ActorInfo =
  | { kind: "worker"; worker: WorkerId; label: string; tone: Tone }
  | { kind: "admin"; id: string }
  | { kind: "system"; label: string };

const WORKER_IDS: WorkerId[] = ["scout", "editor", "keeper"];

// actor is "worker:<id>" | "admin:<uuid>" | (legacy/unknown) → resolve to a structured descriptor.
export function parseActor(actor: string | null | undefined): ActorInfo {
  const raw = (actor ?? "").trim();
  const [prefix, ...rest] = raw.split(":");
  const value = rest.join(":");
  if (prefix === "worker" && (WORKER_IDS as string[]).includes(value)) {
    const worker = value as WorkerId;
    return { kind: "worker", worker, label: WORKER_META[worker].label, tone: WORKER_META[worker].tone };
  }
  if (prefix === "admin" && value) return { kind: "admin", id: value };
  return { kind: "system", label: "System" };
}

// ── Actions ─────────────────────────────────────────────────────────────────
export type ActionInfo = { label: string; tone: Tone; icon: IconKey };

const STATUS_ACTION: Record<string, ActionInfo> = {
  needs_review: { label: "Sent for review", tone: "amber", icon: "review" },
  changes_requested: { label: "Requested changes", tone: "orange", icon: "changes" },
  approved: { label: "Approved", tone: "sky", icon: "approve" },
  published: { label: "Published", tone: "emerald", icon: "publish" },
  rejected: { label: "Rejected", tone: "red", icon: "reject" },
  archived: { label: "Archived", tone: "zinc", icon: "archive" },
  draft: { label: "Set to draft", tone: "zinc", icon: "draft" },
};

const SEVERITY_TONE: Record<string, Tone> = { info: "sky", warn: "amber", critical: "red" };

// Map an audit/activity action token to {label, tone, icon}. Unknown tokens degrade to a neutral
// chip showing the raw token, so new action verbs never crash the feed (forward-compatible).
export function describeAction(action: string): ActionInfo {
  const raw = (action ?? "").trim();
  const [head, ...tailParts] = raw.split(":");
  const tail = tailParts.join(":");

  switch (head) {
    case "create_draft":
      return { label: "Drafted", tone: "zinc", icon: "draft" };
    case "update":
      return { label: "Edited content", tone: "sky", icon: "edit" };
    case "restore_revision":
      return { label: "Restored a version", tone: "sky", icon: "restoreRevision" };
    case "soft_delete":
      return { label: "Moved to trash", tone: "red", icon: "trash" };
    case "restore":
      return { label: "Restored from trash", tone: "emerald", icon: "untrash" };
    case "comment":
      if (tail === "addressed") return { label: "Marked addressed", tone: "emerald", icon: "addressed" };
      if (tail === "dismissed") return { label: "Dismissed", tone: "zinc", icon: "dismissed" };
      return { label: "Commented", tone: "zinc", icon: "comment" };
    case "status":
      return STATUS_ACTION[tail] ?? { label: `Status: ${tail || "?"}`, tone: "zinc", icon: "unknown" };
    case "directive": {
      const label = ACTION_LABELS[tail as DirectiveAction];
      return { label: label ? `Directed: ${label}` : "Directed", tone: "indigo", icon: "directive" };
    }
    case "dispatch": {
      const worker = WORKER_META[tail as WorkerId];
      return { label: worker ? `Dispatched ${worker.label}` : "Dispatched a worker", tone: "brand", icon: "dispatch" };
    }
    case "flag":
      return { label: tail ? `Flagged (${tail})` : "Flagged", tone: SEVERITY_TONE[tail] ?? "amber", icon: "flag" };
    case "reader_comment":
      return { label: "Moderated comment", tone: tail === "removed" ? "red" : "zinc", icon: "moderate" };
    case "config":
      return { label: "Updated config", tone: "zinc", icon: "config" };
    default:
      return { label: raw || "Activity", tone: "zinc", icon: "unknown" };
  }
}

// ── Audit detail (the audit_log.detail JSONB) ─────────────────────────────────
export type AuditDetail = {
  from?: string;
  reason?: string | null;
  note?: string | null;
  changed?: string[];
  comment_id?: string;
  session?: string;
  publish_after?: boolean;
  revision_id?: string;
  severity?: string;
};

// Safely narrow the unstructured detail JSONB to the fields the UI knows how to render.
export function parseAuditDetail(detail: unknown): AuditDetail {
  if (!detail || typeof detail !== "object") return {};
  const d = detail as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  return {
    from: str(d.from),
    reason: str(d.reason) ?? (d.reason === null ? null : undefined),
    note: str(d.note) ?? (d.note === null ? null : undefined),
    changed: Array.isArray(d.changed) ? d.changed.filter((x): x is string => typeof x === "string") : undefined,
    comment_id: str(d.comment_id),
    session: str(d.session),
    publish_after: typeof d.publish_after === "boolean" ? d.publish_after : undefined,
    revision_id: str(d.revision_id),
    severity: str(d.severity),
  };
}
