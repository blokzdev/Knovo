"use client";

import { useId, useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

// Auto-rendered provenance — derived from artifact_sources ⋈ sources, never authored.
export type ProvenanceSource = {
  source_db: string;
  source_uid: string;
  url: string | null;
  title: string | null;
  citation_text: string | null;
  role: "primary" | "supporting";
  retrieved_at?: string | null;
};

const DB_LABEL: Record<string, string> = {
  pdb: "PDB",
  chembl: "ChEMBL",
  pubmed: "PubMed",
  biorxiv: "bioRxiv",
};

function SourceRow({ s }: { s: ProvenanceSource }) {
  const id = `${DB_LABEL[s.source_db] ?? s.source_db} ${s.source_uid}`;
  return (
    <li className="flex flex-col gap-0.5 py-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
          {id}
        </span>
        {s.role === "primary" && (
          <span className="rounded bg-success/10 px-1.5 py-0.5 text-[11px] font-medium text-success">
            primary
          </span>
        )}
        {s.url && (
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
          >
            verify <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      {(s.citation_text || s.title) && (
        <p className="text-xs leading-5 text-muted-foreground">{s.citation_text ?? s.title}</p>
      )}
    </li>
  );
}

export function ProvenanceFooter({ sources }: { sources: ProvenanceSource[] }) {
  const [open, setOpen] = useState(true);
  const panelId = useId();
  if (sources.length === 0) return null;
  const primary = sources.filter((s) => s.role === "primary");
  const supporting = sources.filter((s) => s.role !== "primary");
  return (
    <footer className="mt-6 rounded-lg border border-border bg-muted/50 p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Sources <span className="font-normal normal-case text-muted-foreground/70">({sources.length})</span>
        </h3>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")}
        />
      </button>
      {open && (
        <ul id={panelId} className="mt-1 divide-y divide-border">
          {[...primary, ...supporting].map((s) => (
            <SourceRow key={`${s.source_db}:${s.source_uid}`} s={s} />
          ))}
        </ul>
      )}
    </footer>
  );
}
