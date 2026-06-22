import type { Database } from "@/lib/database.types";

export type Status = Database["public"]["Enums"]["artifact_status"];
export type DirectiveAction = Database["public"]["Enums"]["directive_action"];

// Status display: label + a tone class for a colored badge (token-free, fixed palette so the
// HUD reads at a glance). Order also defines the queue's column order.
export const STATUS_META: Record<Status, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-neutral-100 text-neutral-700 border-neutral-200" },
  needs_review: { label: "Needs review", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  changes_requested: { label: "Changes requested", cls: "bg-orange-100 text-orange-800 border-orange-200" },
  approved: { label: "Approved", cls: "bg-sky-100 text-sky-800 border-sky-200" },
  published: { label: "Published", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-700 border-red-200" },
  archived: { label: "Archived", cls: "bg-zinc-100 text-zinc-600 border-zinc-200" },
};

export const STATUS_ORDER: Status[] = [
  "needs_review",
  "changes_requested",
  "approved",
  "draft",
  "published",
  "archived",
  "rejected",
];

export const ACTION_LABELS: Record<DirectiveAction, string> = {
  revise: "Revise",
  expand: "Expand",
  condense: "Condense",
  reverify: "Re-verify sources",
  split: "Split into series",
  make_series: "Make a series",
  add_to_series: "Add to series",
  archive: "Archive",
};

// Actions offered in the directive composer (with a "none = just a note" sentinel).
export const COMPOSER_ACTIONS: { value: DirectiveAction | "none"; label: string }[] = [
  { value: "none", label: "Comment only (no action)" },
  { value: "revise", label: ACTION_LABELS.revise },
  { value: "expand", label: ACTION_LABELS.expand },
  { value: "condense", label: ACTION_LABELS.condense },
  { value: "reverify", label: ACTION_LABELS.reverify },
  { value: "split", label: ACTION_LABELS.split },
  { value: "make_series", label: ACTION_LABELS.make_series },
  { value: "add_to_series", label: ACTION_LABELS.add_to_series },
  { value: "archive", label: ACTION_LABELS.archive },
];

export const SEVERITY_CLS: Record<string, string> = {
  info: "bg-sky-100 text-sky-800 border-sky-200",
  warn: "bg-amber-100 text-amber-800 border-amber-200",
  critical: "bg-red-100 text-red-700 border-red-200",
};

export const WORKER_META: Record<
  "scout" | "editor" | "keeper",
  { label: string; blurb: string; cta: string }
> = {
  scout: { label: "Scout", blurb: "Discover & draft a new finding.", cta: "Discover now" },
  editor: { label: "Editor", blurb: "Process the open directive queue.", cta: "Process queue" },
  keeper: { label: "Keeper", blurb: "Re-verify published sources.", cta: "Sweep now" },
};
