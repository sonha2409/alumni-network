import { Skeleton } from "@/components/ui/skeleton";

export default function ConnectionsLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      {/* Tab bar skeleton */}
      <Skeleton className="h-11 w-full rounded-lg" />

      {/* Card grid skeleton */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-start gap-3.5">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-2 h-3 w-24" />
              </div>
            </div>
            <Skeleton className="mt-3 h-3 w-40" />
            <Skeleton className="mt-2 h-5 w-24 rounded-md" />
            <Skeleton className="mt-4 h-8 w-28 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
