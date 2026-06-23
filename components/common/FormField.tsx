import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

// Label + control + help/error, with the a11y wiring done once: the child control is cloned with the
// `id`, `aria-describedby`, and `aria-invalid` so consumers just pass an <Input>/<Textarea> child.
export function FormField({
  id,
  label,
  help,
  error,
  children,
  className,
}: {
  id: string;
  label: React.ReactNode;
  help?: React.ReactNode;
  error?: string | null;
  children: React.ReactElement;
  className?: string;
}) {
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : null, help ? helpId : null].filter(Boolean).join(" ") || undefined;

  const control = React.cloneElement(children as React.ReactElement<ControlProps>, {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
  });

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {control}
      {help && !error && (
        <p id={helpId} className="text-xs text-muted-foreground">
          {help}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
