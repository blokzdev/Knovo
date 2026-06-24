import { AlertTriangle, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACTION_LABELS, SEVERITY_CLS, TONES, type DirectiveAction } from "@/lib/admin/labels";

// Server-safe badge cluster for a directive/flag: the action, the publish-after flag, and (for
// reader-raised flags) the severity. One source of truth so the Directives tab and any activity row
// render identical badges.
export function DirectiveBadges({
  action,
  publishAfter,
  severity,
  isFlag,
}: {
  action?: DirectiveAction | null;
  publishAfter?: boolean;
  severity?: string | null;
  isFlag?: boolean;
}) {
  const chip = "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium";
  return (
    <>
      {action && <span className={cn(chip, TONES.indigo)}>{ACTION_LABELS[action]}</span>}
      {publishAfter && (
        <span className={cn(chip, TONES.emerald)}>
          <Send className="h-3 w-3" aria-hidden /> publish after
        </span>
      )}
      {isFlag && (
        <span className={cn(chip, SEVERITY_CLS[severity ?? "info"] ?? SEVERITY_CLS.info)}>
          <AlertTriangle className="h-3 w-3" aria-hidden /> flag · {severity ?? "info"}
        </span>
      )}
    </>
  );
}
