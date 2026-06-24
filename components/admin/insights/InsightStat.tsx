import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TONES, type Tone } from "@/lib/admin/labels";

// Headline metric tile for the Insights view: an icon chip + big value + label + optional hint.
// Server-safe (no client JS). `tone` tints the icon chip from the shared HUD palette.
export function InsightStat({
  icon: Icon,
  value,
  label,
  hint,
  tone = "zinc",
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: React.ReactNode;
  label: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <Card className={cn("h-full", className)}>
      <CardContent className="flex h-full flex-col gap-2 p-4">
        <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-md border", TONES[tone])}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <div className="text-2xl font-semibold tabular-nums leading-none">{value}</div>
          <div className="mt-1 text-xs font-medium text-foreground">{label}</div>
          {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
