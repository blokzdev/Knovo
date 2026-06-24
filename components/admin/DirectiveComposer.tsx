"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { addDirective } from "@/lib/admin/actions";
import { COMPOSER_ACTIONS, type DirectiveAction } from "@/lib/admin/labels";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DirectiveComposer({ artifactId }: { artifactId: string }) {
  const [note, setNote] = useState("");
  const [action, setAction] = useState<DirectiveAction | "none">("none");
  const [publishAfter, setPublishAfter] = useState(false);
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      const r = await addDirective({
        artifactId,
        note,
        action: action === "none" ? null : action,
        publishAfter,
      });
      if (r.ok) {
        toast.success("Directive sent to the queue");
        setNote("");
        setAction("none");
        setPublishAfter(false);
      } else {
        toast.error("Couldn't add directive", { description: r.error });
      }
    });

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-3">
      <Textarea
        placeholder="Natural-language instruction — e.g. “Tighten the abstract and verify the IC50 against ChEMBL.”"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
      />
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
          <Label className="text-xs text-muted-foreground">Action</Label>
          <Select value={action} onValueChange={(v) => setAction(v as DirectiveAction | "none")}>
            <SelectTrigger className="h-8 w-full min-w-0 text-xs sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMPOSER_ACTIONS.map((a) => (
                <SelectItem key={a.value} value={a.value} className="text-xs">
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="publish-after" checked={publishAfter} onCheckedChange={setPublishAfter} />
          <Label htmlFor="publish-after" className="text-xs text-muted-foreground">
            …and publish when done
          </Label>
        </div>
        <Button size="sm" className="ml-auto" disabled={pending} onClick={submit}>
          <Send className="h-3.5 w-3.5" /> Add directive
        </Button>
      </div>
    </div>
  );
}
