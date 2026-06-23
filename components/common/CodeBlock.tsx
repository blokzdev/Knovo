import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";

// Theme-aware, horizontally-scrollable code block with a copy affordance. Used for the routine
// setup guide's env snippet and any future copyable blocks. `copyLabel` customizes the button text
// (e.g. "Copy prompt"); `maxHeight` caps a long block so it scrolls instead of dominating the page.
export function CodeBlock({
  code,
  className,
  copyLabel,
  maxHeight,
}: {
  code: string;
  className?: string;
  copyLabel?: string;
  maxHeight?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <CopyButton value={code} label={copyLabel} className="absolute right-2 top-2 z-10 h-7" />
      <pre
        className="overflow-auto rounded-md border border-border bg-muted p-4 pr-28 font-mono text-xs leading-relaxed text-foreground"
        style={maxHeight ? { maxHeight } : undefined}
      >
        {code}
      </pre>
    </div>
  );
}
