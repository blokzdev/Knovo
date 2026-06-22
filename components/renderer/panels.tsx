import type { ArtifactDocV1 } from "@/lib/artifact-schema";
import { ProsePanel } from "./ProsePanel";

type Panel = ArtifactDocV1["panels"][number];

function KeyValuePanel({ content }: { content: { k: string; v: string }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-[max-content_1fr]">
      {content.map((row, i) => (
        <div key={i} className="contents">
          <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500 sm:py-1">
            {row.k}
          </dt>
          <dd className="text-sm text-neutral-800 sm:py-1">{row.v}</dd>
        </div>
      ))}
    </dl>
  );
}

function FigurePanel({ content }: { content: { src: string; alt: string } }) {
  return (
    <figure className="overflow-hidden rounded-lg border border-neutral-200">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={content.src} alt={content.alt} className="w-full" />
      {content.alt && (
        <figcaption className="border-t border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
          {content.alt}
        </figcaption>
      )}
    </figure>
  );
}

export function PanelBlock({ panel }: { panel: Panel }) {
  switch (panel.kind) {
    case "prose":
      return <ProsePanel content={panel.content} />;
    case "keyvalue":
      return <KeyValuePanel content={panel.content} />;
    case "figure":
      return <FigurePanel content={panel.content} />;
    default:
      return null;
  }
}
