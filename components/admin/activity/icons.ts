import {
  AlertTriangle,
  Archive,
  Ban,
  Check,
  CheckCheck,
  Cog,
  Eye,
  FilePlus,
  Globe,
  HelpCircle,
  History,
  MessageSquare,
  MessageSquareWarning,
  PencilLine,
  Play,
  RotateCcw,
  Settings,
  ShieldCheck,
  Telescope,
  Trash2,
  Undo2,
  UserCog,
  X,
  type LucideIcon,
} from "lucide-react";
import type { IconKey } from "@/lib/admin/activity";
import type { WorkerId } from "@/lib/admin/labels";

// Resolve the pure IconKey vocabulary (lib/admin/activity.ts) to concrete lucide components. Kept in
// the component layer so lib/admin/activity.ts stays a pure, server-safe, testable data module.
export const ACTION_ICONS: Record<IconKey, LucideIcon> = {
  draft: FilePlus,
  edit: PencilLine,
  review: Eye,
  changes: RotateCcw,
  approve: Check,
  publish: Globe,
  reject: Ban,
  archive: Archive,
  directive: MessageSquare,
  comment: MessageSquare,
  addressed: CheckCheck,
  dismissed: X,
  dispatch: Play,
  restoreRevision: History,
  trash: Trash2,
  untrash: Undo2,
  moderate: MessageSquareWarning,
  config: Settings,
  flag: AlertTriangle,
  unknown: HelpCircle,
};

export const WORKER_ICONS: Record<WorkerId, LucideIcon> = {
  scout: Telescope,
  editor: PencilLine,
  keeper: ShieldCheck,
};

export const ADMIN_ICON = UserCog;
export const SYSTEM_ICON = Cog;
