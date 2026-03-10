import { Skeleton } from "@/components/ui/skeleton";

export default function GroupsLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header skeleton */}
      <div className="flex items-start justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Search bar skeleton */}
      <Skeleton className="h-10 w-full rounded-xl" />

      {/* Filter bar skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-8 w-40 rounded-lg" />
      </div>

      {/* Count skeleton */}
      <Skeleton className="h-4 w-36" />

      {/* Card grid skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-xl border border-border p-5"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-4 w-10" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="mt-2 h-8 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
