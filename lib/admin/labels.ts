import type { Database } from "@/lib/database.types";

export type Status = Database["public"]["Enums"]["artifact_status"];
export type DirectiveAction = Database["public"]["Enums"]["directive_action"];

// Reusable badge tones (soft tint + readable text, each with a dark-mode variant). Shared by the
// activity vocabulary (ActionChip / ActorBadge / RunGroup) so every chip in the HUD reads from one
// palette. `brand` reuses the indigo/violet brand token.
export type Tone = "zinc" | "sky" | "amber" | "orange" | "emerald" | "red" | "indigo" | "brand";
export const TONES: Record<Tone, string> = {
  zinc: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-500/15 dark:text-zinc-300 dark:border-zinc-500/30",
  sky: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30",
  amber: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  orange: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30",
  emerald: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  red: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
  indigo: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30",
  brand: "border-brand/25 bg-brand/10 text-brand",
};

// Run lifecycle (routine_runs.status). We only know what dispatch tells us — see migration 0010.
export const RUN_STATUS_META: Record<string, { label: string; tone: Tone }> = {
  dispatched: { label: "Dispatched", tone: "brand" },
  failed: { label: "Dispatch failed", tone: "red" },
};

// Status display: label + a tone class for a colored badge. Distinct hues so the HUD reads at a
// glance, each with a dark-mode variant (soft tint + lighter text). Order = queue column order.
export const STATUS_META: Record<Status, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "border-border bg-muted text-muted-foreground" },
  needs_review: {
    label: "Needs review",
    cls: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  },
  changes_requested: {
    label: "Changes requested",
    cls: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30",
  },
  approved: {
    label: "Approved",
    cls: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30",
  },
  published: {
    label: "Published",
    cls: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  rejected: {
    label: "Rejected",
    cls: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
  },
  archived: {
    label: "Archived",
    cls: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-500/15 dark:text-zinc-300 dark:border-zinc-500/30",
  },
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
  info: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30",
  warn: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  critical: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
};

export type WorkerId = "scout" | "editor" | "keeper";

export const WORKER_META: Record<
  WorkerId,
  { label: string; blurb: string; cta: string; tone: Tone }
> = {
  scout: { label: "Scout", blurb: "Discover & draft a new finding.", cta: "Discover now", tone: "sky" },
  editor: { label: "Editor", blurb: "Process the open directive queue.", cta: "Process queue", tone: "amber" },
  keeper: { label: "Keeper", blurb: "Re-verify published sources.", cta: "Sweep now", tone: "emerald" },
};
