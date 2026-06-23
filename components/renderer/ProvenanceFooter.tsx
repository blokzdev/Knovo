import { ExternalLink } from "lucide-react";

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
  if (sources.length === 0) return null;
  const primary = sources.filter((s) => s.role === "primary");
  const supporting = sources.filter((s) => s.role !== "primary");
  return (
    <footer className="mt-6 rounded-lg border border-border bg-muted/50 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sources</h3>
      <ul className="mt-1 divide-y divide-border">
        {[...primary, ...supporting].map((s) => (
          <SourceRow key={`${s.source_db}:${s.source_uid}`} s={s} />
        ))}
      </ul>
    </footer>
  );
}
