import { AlertTriangle } from "lucide-react";
import { safeParseArtifactDoc, type ArtifactDocV1 } from "@/lib/artifact-schema";
import { InteractiveStage } from "./InteractiveStage";
import { PanelBlock } from "./panels";
import { ProvenanceFooter, type ProvenanceSource } from "./ProvenanceFooter";

type Caption = ArtifactDocV1["captions"][number];

function CaptionList({ captions }: { captions: Caption[] }) {
  if (captions.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {captions.map((c) => (
        <li key={c.id} className="flex gap-2 text-xs leading-5 text-muted-foreground">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
          <span>{c.text}</span>
        </li>
      ))}
    </ul>
  );
}

// The single, shared artifact renderer. Validates the slot document on read, then renders the
// stage (interactive), panels, captions, and the auto provenance footer. Reused as the admin
// preview now and on public pages later (no admin coupling). Responsive portrait + landscape;
// the immersive mode is a follow-up.
export function ArtifactRenderer({
  doc,
  schemaVersion,
  sources,
  showHeader = true,
}: {
  doc: unknown;
  schemaVersion: number;
  sources: ProvenanceSource[];
  showHeader?: boolean;
}) {
  const parsed = safeParseArtifactDoc(schemaVersion, doc);
  if (!parsed.success) {
    const message =
      typeof parsed.error === "string"
        ? parsed.error
        : parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return (
      <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">This document doesn&apos;t match the current schema.</p>
          <p className="mt-1 text-xs text-warning/80">{message}</p>
        </div>
      </div>
    );
  }

  const d = parsed.data;
  const stageCaptions = d.captions.filter(
    (c) => c.target === d.stage.id || c.target.startsWith("stage:"),
  );
  const captionsForPanel = (panelId: string) => d.captions.filter((c) => c.target === panelId);

  return (
    <div>
      {showHeader && (
        <header className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{d.title}</h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{d.summary}</p>
        </header>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-3">
          <InteractiveStage stage={d.stage} controls={d.controls} />
          <CaptionList captions={stageCaptions} />
        </div>

        {d.panels.length > 0 && (
          <aside className="space-y-5">
            {d.panels.map((p) => (
              <section key={p.id} className="space-y-2">
                <PanelBlock panel={p} />
                <CaptionList captions={captionsForPanel(p.id)} />
              </section>
            ))}
          </aside>
        )}
      </div>

      <ProvenanceFooter sources={sources} />
    </div>
  );
}

export type { ProvenanceSource };
