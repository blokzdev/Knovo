"use client";

import Link from "next/link";
import { MoreVertical, Settings2, ExternalLink, BarChart3 } from "lucide-react";
import { WORKER_META, type WorkerId } from "@/lib/admin/labels";
import { settingsHref } from "@/lib/admin/worker-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Per-card contextual menu (the ⋯ kebab) for a dispatch worker's secondary actions. Pure navigation
// (no dispatch logic lives here — the card's primary button owns "run now"): jump to the worker's
// settings tab, reopen its last Claude session, or see it in Insights.
export function WorkerCardMenu({ worker, sessionUrl }: { worker: WorkerId; sessionUrl: string | null }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`More actions for ${WORKER_META[worker].label}`}>
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <Link href={settingsHref(worker)}>
            <Settings2 /> Configure routine
          </Link>
        </DropdownMenuItem>
        {sessionUrl && (
          <DropdownMenuItem asChild>
            <a
              href={sessionUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open last ${WORKER_META[worker].label} session (opens in a new tab)`}
            >
              <ExternalLink /> Open last session
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/admin/insights">
            <BarChart3 /> View in Insights
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
