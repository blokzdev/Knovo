import Link from "next/link";
import { Compass, Home } from "lucide-react";
import { KnovoWordmark } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <KnovoWordmark />
      <p className="mt-8 text-sm font-semibold text-brand">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">This page doesn&apos;t exist</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The page you&apos;re looking for may have been moved, unpublished, or never existed.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/">
            <Home /> Home
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/explore">
            <Compass /> Explore
          </Link>
        </Button>
      </div>
    </main>
  );
}
