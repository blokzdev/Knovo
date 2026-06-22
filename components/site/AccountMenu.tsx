"use client";

import { useTransition } from "react";
import Link from "next/link";
import { LogIn, LogOut, Bookmark, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Viewer } from "@/lib/reader/viewer";

export function AccountMenu({ viewer }: { viewer: Viewer | null }) {
  const [pending, start] = useTransition();

  if (!viewer) {
    const signIn = () =>
      start(async () => {
        const supabase = createClient();
        const next = window.location.pathname + window.location.search;
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
      });
    return (
      <Button size="sm" onClick={signIn} disabled={pending}>
        <LogIn className="h-4 w-4" /> Sign in
      </Button>
    );
  }

  const signOut = () =>
    start(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.assign("/");
    });

  const label = viewer.displayName ?? viewer.email ?? "Account";
  const initial = (label.trim()[0] ?? "?").toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Account menu"
          className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-neutral-100 text-sm font-medium text-neutral-700"
        >
          {viewer.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={viewer.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            initial
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account/bookmarks">
            <Bookmark className="h-4 w-4" /> My bookmarks
          </Link>
        </DropdownMenuItem>
        {viewer.isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Shield className="h-4 w-4" /> Admin HUD
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} disabled={pending}>
          <LogOut className="h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
