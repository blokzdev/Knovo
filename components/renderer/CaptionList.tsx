import type { ArtifactDocV1 } from "@/lib/artifact-schema";

type Caption = ArtifactDocV1["captions"][number];

// Captions bound to a slot (stage or panel). Extracted so both the normal layout
// (ArtifactRenderer) and the immersive chrome can render them identically.
export function CaptionList({ captions }: { captions: Caption[] }) {
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
