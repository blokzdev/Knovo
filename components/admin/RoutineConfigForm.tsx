"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Save } from "lucide-react";
import { saveAppSetting, saveRoutineConfig } from "@/lib/admin/actions";
import { isAllowedFireUrl, FIRE_URL_REQUIREMENT } from "@/lib/routine-url";
import { WORKER_META } from "@/lib/admin/labels";
import type { ConfigSource, RoutineSetting, RoutineSettings } from "@/lib/admin/settings";
import { FormField } from "@/components/common/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DispatchButton } from "./DispatchButton";

const SOURCE_META: Record<ConfigSource, { label: string; cls: string }> = {
  db: { label: "Configured", cls: "border-success/30 bg-success/10 text-success" },
  env: { label: "Env fallback", cls: "border-warning/30 bg-warning/10 text-warning" },
  none: { label: "Not set", cls: "border-border bg-muted text-muted-foreground" },
};

export function RoutineConfigForm({ settings }: { settings: RoutineSettings }) {
  return (
    <div className="space-y-6">
      <GlobalCard knovoApiBase={settings.knovoApiBase} />
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Routine triggers</h2>
        {settings.routines.map((r) => (
          <RoutineCard key={r.worker} setting={r} />
        ))}
      </div>
    </div>
  );
}

function GlobalCard({ knovoApiBase }: { knovoApiBase: string }) {
  const [value, setValue] = useState(knovoApiBase);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const r = await saveAppSetting({ key: "knovo_api_base", value });
      if (r.ok) toast.success("Saved", { description: "KNOVO_API_BASE updated." });
      else toast.error("Couldn't save", { description: r.error });
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Worker API base</CardTitle>
        <CardDescription>
          The governed Knovo API URL the workers call. Shown in the setup guide for reference —
          dispatch uses each routine&apos;s fire URL, not this value.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormField id="knovo-api-base" label="KNOVO_API_BASE">
          <Input
            type="url"
            placeholder="https://api.knovo.ai"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </FormField>
      </CardContent>
      <CardFooter className="justify-end">
        <Button type="button" size="sm" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Save
        </Button>
      </CardFooter>
    </Card>
  );
}

function RoutineCard({ setting }: { setting: RoutineSetting }) {
  const meta = WORKER_META[setting.worker];
  const [fireUrl, setFireUrl] = useState(setting.fireUrl);
  const [token, setToken] = useState("");
  const [reveal, setReveal] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [tokenWarn, setTokenWarn] = useState(false);
  const [pending, start] = useTransition();

  const source = SOURCE_META[setting.source];
  const urlId = `fire-url-${setting.worker}`;
  const tokenId = `token-${setting.worker}`;
  const tokenPlaceholder = setting.hasToken ? `•••• •••• ${setting.tokenLast4}` : "sk-ant-oat01-…";

  const checkUrl = (v: string) => {
    const t = v.trim();
    setUrlError(t && !isAllowedFireUrl(t) ? FIRE_URL_REQUIREMENT : null);
  };

  const save = () => {
    const t = fireUrl.trim();
    if (t && !isAllowedFireUrl(t)) {
      setUrlError(FIRE_URL_REQUIREMENT);
      return;
    }
    start(async () => {
      const r = await saveRoutineConfig({ worker: setting.worker, fireUrl, token: token || undefined });
      if (r.ok) {
        toast.success(`${meta.label} saved`);
        setToken("");
        setReveal(false);
        setTokenWarn(false);
      } else {
        toast.error(`Couldn't save ${meta.label}`, { description: r.error });
      }
    });
  };

  const clearToken = () =>
    start(async () => {
      const r = await saveRoutineConfig({ worker: setting.worker, fireUrl, clearToken: true });
      if (r.ok) {
        toast.success(`${meta.label} token cleared`);
        setToken("");
      } else {
        toast.error("Couldn't clear token", { description: r.error });
      }
    });

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-base">{meta.label}</CardTitle>
          <CardDescription>{meta.blurb}</CardDescription>
        </div>
        <Badge variant="outline" className={cn("shrink-0", source.cls)}>
          {source.label}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField id={urlId} label="Fire URL" error={urlError}>
          <Input
            type="url"
            inputMode="url"
            placeholder="https://…/fire"
            value={fireUrl}
            onChange={(e) => setFireUrl(e.target.value)}
            onBlur={(e) => checkUrl(e.target.value)}
            className={cn(urlError && "border-destructive focus-visible:ring-destructive")}
          />
        </FormField>

        <div>
          <Label htmlFor={tokenId}>Trigger token</Label>
          <div className="mt-1.5 flex gap-2">
            <Input
              id={tokenId}
              type={reveal ? "text" : "password"}
              placeholder={tokenPlaceholder}
              value={token}
              onChange={(e) => {
                const v = e.target.value;
                setToken(v);
                setTokenWarn(v.length > 0 && !v.startsWith("sk-ant-oat01-"));
              }}
              autoComplete="off"
              spellCheck={false}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={reveal ? "Hide token" : "Show token"}
              aria-pressed={reveal}
              onClick={() => setReveal((v) => !v)}
            >
              {reveal ? <EyeOff /> : <Eye />}
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Leave blank to keep the current token.</p>
          {tokenWarn && (
            <p className="mt-1 text-xs text-warning">
              Tokens usually start with <span className="font-mono">sk-ant-oat01-</span> — double-check this value.
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={save} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Save />} Save
          </Button>
          {setting.hasToken && (
            <Button type="button" size="sm" variant="ghost" onClick={clearToken} disabled={pending}>
              Clear token
            </Button>
          )}
        </div>
        <DispatchButton worker={setting.worker} label="Test" disabled={setting.source === "none"} />
      </CardFooter>
    </Card>
  );
}
