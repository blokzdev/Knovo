import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";

// Theme-aware, horizontally-scrollable code block with a copy affordance. Used for the routine
// setup guide's env snippet and any future copyable blocks.
export function CodeBlock({ code, className }: { code: string; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <CopyButton value={code} className="absolute right-2 top-2 h-7" />
      <pre className="overflow-x-auto rounded-md border border-border bg-muted p-4 pr-24 font-mono text-xs leading-relaxed text-foreground">
        {code}
      </pre>
    </div>
  );
}
