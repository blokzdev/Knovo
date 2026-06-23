import { ChevronRight, PencilLine, ShieldCheck, Telescope, type LucideIcon } from "lucide-react";
import type { WorkerId } from "@/lib/routines";
import { WORKER_ROUTINES } from "@/lib/workers/routines";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/common/CodeBlock";
import { CopyButton } from "@/components/ui/copy-button";

// Per-worker routine setup guidance for /admin/settings: how to configure THIS routine in the
// Claude web app — name, connectors, triggers, verb scope, env token — plus the paste-ready system
// prompt (copyable) behind a disclosure. All text is sourced from lib/workers/routines.ts, which is
// drift-guarded against docs/routines.md. Composes into the client settings tabs.
const ICONS: Record<WorkerId, LucideIcon> = {
  scout: Telescope,
  editor: PencilLine,
  keeper: ShieldCheck,
};

export function WorkerRoutineGuide({ worker }: { worker: WorkerId }) {
  const w = WORKER_ROUTINES[worker];
  const Icon = ICONS[worker];

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 space-y-0.5">
          <h3 className="text-sm font-semibold text-foreground">{w.label} — routine setup</h3>
          <p className="text-xs text-muted-foreground">{w.role}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Routine name</span>
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{w.routineName}</code>
        <CopyButton value={w.routineName} label="Copy name" size="sm" variant="ghost" className="h-6 px-2 text-xs" />
      </div>

      <dl className="grid grid-cols-1 gap-x-4 gap-y-2.5 text-xs sm:grid-cols-[max-content_1fr]">
        <dt className="font-medium text-muted-foreground">Model</dt>
        <dd className="text-foreground">{w.model}</dd>

        <dt className="font-medium text-muted-foreground">Triggers</dt>
        <dd className="text-foreground">{w.triggers}</dd>

        <dt className="font-medium text-muted-foreground">Connectors</dt>
        <dd className="space-y-1">
          <div className="flex flex-wrap gap-1.5">
            {w.connectorsKeep.map((c) => (
              <Badge key={c} variant="outline" className="border-success/30 bg-success/10 text-success">
                {c}
              </Badge>
            ))}
          </div>
          <p className="text-muted-foreground">{w.connectorsNote}</p>
        </dd>

        <dt className="font-medium text-muted-foreground">API scope</dt>
        <dd className="flex flex-wrap gap-1.5">
          {w.scopes.map((s) => (
            <Badge key={s} variant="outline" className="font-mono text-[11px]">
              {s}
            </Badge>
          ))}
        </dd>

        <dt className="font-medium text-muted-foreground">Env token</dt>
        <dd className="flex flex-wrap items-center gap-2">
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{w.envToken}</code>
          <CopyButton value={w.envToken} label="Copy" size="sm" variant="ghost" className="h-6 px-2 text-xs" />
        </dd>
      </dl>

      <details className="group rounded-lg border border-border bg-background">
        <summary className="flex cursor-pointer list-none items-center gap-2 p-3 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
          Routine instructions (system prompt)
        </summary>
        <div className="space-y-2 border-t border-border p-3">
          <p className="text-xs text-muted-foreground">
            Paste this as the routine&apos;s <span className="font-medium">system prompt</span> in the Claude web app.
          </p>
          <CodeBlock code={w.instructions} copyLabel="Copy prompt" maxHeight="22rem" />
        </div>
      </details>
    </section>
  );
}
