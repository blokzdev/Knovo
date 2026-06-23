import { ChevronRight } from "lucide-react";
import { CodeBlock } from "@/components/common/CodeBlock";

// Instructional disclosure for the shared "Knovo" cloud environment, mirroring the Claude web app's
// "New cloud environment" modal field-for-field (Name → Network access → Environment variables →
// Setup script), then the per-routine steps. Native <details> so it needs no JS, is keyboard-
// accessible, and renders server-side. The env block is templated with the saved KNOVO_API_BASE.
export function RoutineSetupGuide({ knovoApiBase }: { knovoApiBase: string }) {
  const base = knovoApiBase || "https://api.knovo.ai";
  const allowedDomainsBlock = ["api.knovo.ai", "data.rcsb.org", "files.rcsb.org"].join("\n");
  const envBlock = [
    `KNOVO_API_BASE=${base}`,
    `KNOVO_WORKER_TOKEN_SCOUT=<same value as in Vercel>`,
    `KNOVO_WORKER_TOKEN_EDITOR=<same value as in Vercel>`,
    `KNOVO_WORKER_TOKEN_KEEPER=<same value as in Vercel>`,
  ].join("\n");
  // Optional: workers only curl the governed API + use MCP, so no setup is required. This non-fatal
  // probe confirms the API is reachable — i.e. that the Custom allowlist above is correct.
  const setupScript = [
    "#!/bin/bash",
    'curl -sS -o /dev/null -w "Knovo API reachable: HTTP %{http_code}\\n" "$KNOVO_API_BASE" || true',
  ].join("\n");

  return (
    <details className="group rounded-xl border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
        Shared setup — the &ldquo;Knovo&rdquo; cloud environment (do this once for all three routines)
      </summary>
      <div className="space-y-4 border-t border-border p-4 text-sm leading-6 text-foreground">
        <p className="text-muted-foreground">
          In the Claude web app, create one reusable cloud environment and attach it to all three
          routines. The fields below match the <span className="font-medium">New cloud environment</span>{" "}
          dialog. The per-worker prompt, connectors, and trigger live in the tabs below.
        </p>

        <ol className="list-decimal space-y-4 pl-5">
          <li>
            <span className="font-medium">Name</span> → <span className="font-mono text-xs">Knovo</span>.
          </li>

          <li>
            <span className="font-medium">Network access</span> → choose{" "}
            <span className="font-medium">Custom</span> and paste these into the{" "}
            <span className="font-medium">Allowed domains</span> field (leave{" "}
            <em>Also include default list of common package managers</em> unchecked — the workers
            install nothing). MCP connectors route through Anthropic, so they need no allowlisting.
            <span className="mt-1 block text-xs text-muted-foreground">
              Prefer least privilege; <span className="font-medium">Full</span> also works if you want a
              simpler, looser setup.
            </span>
            <div className="mt-2">
              <CodeBlock code={allowedDomainsBlock} copyLabel="Copy domains" />
            </div>
          </li>

          <li>
            <span className="font-medium">Environment variables</span> → paste this{" "}
            <span className="font-mono text-xs">.env</span> block (one{" "}
            <span className="font-mono text-xs">KEY=value</span> per line, no quotes):
            <div className="mt-2">
              <CodeBlock code={envBlock} copyLabel="Copy variables" />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Claude has no separate secrets store, so the bearer tokens live here. They&apos;re visible
              to anyone who can edit this environment — in Knovo&apos;s single-admin setup that&apos;s just
              you. Each token is verb-scoped and revocable (see each worker&apos;s tab); rotate it if you
              ever share the environment. Never put the Supabase service-role key here.
            </p>
          </li>

          <li>
            <span className="font-medium">Setup script</span> →{" "}
            <span className="text-muted-foreground">optional, not required.</span> Workers only call the
            API and use connectors, both available by default. If you want a setup-time check that the
            allowlist is right, paste this non-fatal probe:
            <div className="mt-2">
              <CodeBlock code={setupScript} copyLabel="Copy script" />
            </div>
          </li>
        </ol>

        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-xs font-medium text-foreground">Then, for each routine (in its tab below):</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            <li>
              select the <span className="font-medium">Knovo</span> environment and your{" "}
              <span className="font-medium">worker-harness repo</span> (a dedicated context repo, not
              the app repo — see the harness note below);
            </li>
            <li>set its connectors, triggers, and paste its system prompt from the tab;</li>
            <li>
              add a trigger → <span className="font-medium">API</span> → Generate token, then paste the
              trigger URL +{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">sk-ant-oat01-…</code>{" "}
              token into that worker&apos;s trigger card.
            </li>
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-xs font-medium text-foreground">The worker-harness repo</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Each routine&apos;s <span className="font-medium">Repository</span> should be a dedicated{" "}
            <span className="font-medium">worker-harness repo</span> — shared context for the workers,{" "}
            <em>not</em> the Knovo app repo (whose docs are about building Knovo). Workers reach content
            only through the API, so this repo carries context + coordination notes, never content. Use
            the public baseline harness or fork it. Recommended structure:
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            <li>
              top-level <span className="font-mono">AGENTS.md</span> /{" "}
              <span className="font-mono">CLAUDE.md</span> — the shared constitution (niche, voice,
              slot-schema + API contract);
            </li>
            <li>
              one subfolder per worker (<span className="font-mono">scout/ editor/ keeper/</span>) for
              that worker&apos;s playbook + append-only notes.
            </li>
          </ul>
          <p className="mt-1.5 text-xs text-muted-foreground">
            <span className="font-medium">Planned (not wired yet):</span> a 4th{" "}
            <span className="font-medium">Supervisor</span> routine that reconciles the workers&apos;
            notes into the shared layer (no content token) — optionally triggered by a native{" "}
            <span className="font-medium">GitHub Event</span> (a push to the harness repo) — plus
            advanced per-worker parametric config. Design: <span className="font-medium">foundation/worker-harness.md</span>.
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          The dashboard trigger token (the <span className="font-mono">sk-ant-oat01-…</span> value) is
          stored masked and server-only, never shown again. See{" "}
          <span className="font-medium">SETUP.md §7</span> and{" "}
          <span className="font-medium">foundation/worker-harness.md</span> for the full walkthrough.
        </p>
      </div>
    </details>
  );
}
