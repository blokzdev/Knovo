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
        <span className="inline-flex items-center rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-mono text-[11px] text-neutral-600">
          {id}
        </span>
        {s.role === "primary" && (
          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">
            primary
          </span>
        )}
        {s.url && (
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
          >
            verify <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      {(s.citation_text || s.title) && (
        <p className="text-xs leading-5 text-neutral-600">{s.citation_text ?? s.title}</p>
      )}
    </li>
  );
}

export function ProvenanceFooter({ sources }: { sources: ProvenanceSource[] }) {
  if (sources.length === 0) return null;
  const primary = sources.filter((s) => s.role === "primary");
  const supporting = sources.filter((s) => s.role !== "primary");
  return (
    <footer className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50/50 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Sources</h3>
      <ul className="mt-1 divide-y divide-neutral-200">
        {[...primary, ...supporting].map((s) => (
          <SourceRow key={`${s.source_db}:${s.source_uid}`} s={s} />
        ))}
      </ul>
    </footer>
  );
}
