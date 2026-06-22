"use client";

import { useTransition } from "react";
import { LogIn, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function SignInButton() {
  const [pending, start] = useTransition();
  const signIn = () =>
    start(async () => {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/admin` },
      });
    });
  return (
    <Button onClick={signIn} disabled={pending}>
      <LogIn className="h-4 w-4" /> Sign in with Google
    </Button>
  );
}

export function SignOutButton() {
  const [pending, start] = useTransition();
  const signOut = () =>
    start(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.assign("/");
    });
  return (
    <Button variant="ghost" size="sm" onClick={signOut} disabled={pending}>
      <LogOut className="h-4 w-4" /> Sign out
    </Button>
  );
}
