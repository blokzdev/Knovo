import { Skeleton } from "@/components/ui/skeleton";

// Reader skeleton — mirrors the ArtifactRenderer layout (title + main stage + 300px sidebar) so the
// page doesn't jump when content streams in.
export default function ReaderLoading() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10" aria-busy="true">
      <Skeleton className="h-4 w-24" />
      <div className="mt-6 space-y-3">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Skeleton className="h-4 w-5/6 max-w-2xl" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Skeleton className="h-[clamp(300px,50vh,360px)] w-full rounded-lg" />
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
        </div>
      </div>
    </main>
  );
}
