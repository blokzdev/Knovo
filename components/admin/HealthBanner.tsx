import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { cn, focusRing } from "@/lib/utils";
import type { HealthAlert } from "@/lib/admin/health";

// Top-of-HUD "needs attention" strip. When the loop runs unattended on a cadence, this is the glance
// that says whether anything needs the admin — overdue reviews, a failed dispatch, a drop-rate spike —
// each linking straight to where it's handled. Renders a quiet all-clear when there's nothing. Server-safe.
const SEV: Record<HealthAlert["severity"], string> = {
  warn: "border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-300 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:border-amber-500/50",
  critical: "border-red-200 bg-red-50 text-red-900 hover:border-red-300 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200 dark:hover:border-red-500/50",
};

export function HealthBanner({ alerts }: { alerts: HealthAlert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" aria-hidden />
        No issues need your attention — the loop is running clean.
      </div>
    );
  }
  return (
    <div className="space-y-2" role="region" aria-label="Needs attention">
      {alerts.map((a) => (
        <Link
          key={`${a.kind}:${a.title}`}
          href={a.href}
          className={cn("flex items-center gap-3 rounded-lg border px-4 py-2.5 transition-colors", SEV[a.severity], focusRing)}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium sm:inline">{a.title}</span>
            <span className="block break-words text-xs opacity-80 sm:ml-2 sm:inline">{a.detail}</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
        </Link>
      ))}
    </div>
  );
}
