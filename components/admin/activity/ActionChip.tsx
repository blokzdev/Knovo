import { cn } from "@/lib/utils";
import { TONES } from "@/lib/admin/labels";
import { describeAction } from "@/lib/admin/activity";
import { ACTION_ICONS } from "./icons";

// Server-safe chip: maps an audit/activity action token to a human label + icon + tone.
export function ActionChip({ action, className }: { action: string; className?: string }) {
  const { label, tone, icon } = describeAction(action);
  const Icon = ACTION_ICONS[icon];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}
