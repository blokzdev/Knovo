"use client";

import { useTransition } from "react";
import Link from "next/link";
import { LogIn, LogOut, Bookmark, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/common/Avatar";
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Account menu"
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Avatar name={label} src={viewer.avatarUrl} />
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
