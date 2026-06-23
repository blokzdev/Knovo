"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Home, RotateCw } from "lucide-react";
import { KnovoWordmark } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <KnovoWordmark />
      <h1 className="mt-8 text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        An unexpected error occurred. You can try again, or head back home.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset}>
          <RotateCw /> Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/">
            <Home /> Home
          </Link>
        </Button>
      </div>
    </main>
  );
}
