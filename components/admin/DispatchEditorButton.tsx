import { DispatchButton } from "./DispatchButton";

// Fire the Editor worker now, pointed at this artifact. The worker reads the full open-directive
// queue from the API; the text payload just nudges it to act on this one immediately.
export function DispatchEditorButton({ artifactId, slug }: { artifactId: string; slug: string }) {
  return (
    <DispatchButton
      worker="editor"
      artifactId={artifactId}
      text={`Process the open directives on artifact ${artifactId} (slug: ${slug}) now.`}
      label="Send to Editor now"
    />
  );
}
