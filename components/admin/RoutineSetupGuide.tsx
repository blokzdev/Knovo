import { ChevronRight } from "lucide-react";
import { CodeBlock } from "@/components/common/CodeBlock";

// Instructional disclosure: how to mint a routine's API trigger credentials and what to put on the
// routine's "Knovo" cloud environment. Built on a native <details> so it needs no JS, is
// keyboard-accessible, and renders server-side. The env block is templated with the saved
// KNOVO_API_BASE (reference only — dispatch uses each routine's fire URL, not this value).
export function RoutineSetupGuide({ knovoApiBase }: { knovoApiBase: string }) {
  const base = knovoApiBase || "https://api.knovo.ai";
  const envBlock = [
    `KNOVO_API_BASE=${base}`,
    `KNOVO_WORKER_TOKEN_SCOUT=<same value as in Vercel>`,
    `KNOVO_WORKER_TOKEN_EDITOR=<same value as in Vercel>`,
    `KNOVO_WORKER_TOKEN_KEEPER=<same value as in Vercel>`,
  ].join("\n");
  const allowlistBlock = ["api.knovo.ai", "data.rcsb.org", "files.rcsb.org"].join("\n");

  return (
    <details className="group rounded-xl border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
        Shared setup — do this once for all three routines
      </summary>
      <div className="space-y-4 border-t border-border p-4 text-sm leading-6 text-foreground">
        <p className="text-muted-foreground">
          The three routines share one reusable <span className="font-medium">&ldquo;Knovo&rdquo;</span>{" "}
          cloud environment — configure it once, then attach it to each routine. The per-worker prompt,
          connectors, and trigger live in the tabs below.
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Create a cloud environment named <span className="font-medium">&ldquo;Knovo&rdquo;</span> and
            set its network access to <span className="font-medium">Custom</span> with this allowlist:
          </li>
        </ol>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Network allowlist</p>
          <CodeBlock code={allowlistBlock} />
        </div>
        <ol className="list-decimal space-y-2 pl-5" start={2}>
          <li>
            Set the environment variables below (the worker tokens must match the values in Vercel),
            then select the <span className="font-medium">Knovo</span> repository.
          </li>
        </ol>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Routine environment variables</p>
          <CodeBlock code={envBlock} />
        </div>
        <ol className="list-decimal space-y-2 pl-5" start={3}>
          <li>
            For each routine: mint its trigger via Add trigger → <span className="font-medium">API</span> →
            Generate token, and paste the trigger URL +{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">sk-ant-oat01-…</code> token into
            that worker&apos;s tab below.
          </li>
        </ol>
        <p className="text-xs text-muted-foreground">
          The worker tokens are verified server-side from Vercel env and are never stored or shown
          here. See <span className="font-medium">SETUP.md §7a</span> for the full walkthrough.
        </p>
      </div>
    </details>
  );
}
