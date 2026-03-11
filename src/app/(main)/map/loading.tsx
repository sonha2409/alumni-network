import { Skeleton } from "@/components/ui/skeleton";

export default function MapLoading() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full">
      {/* Sidebar skeleton */}
      <div className="hidden w-80 flex-shrink-0 border-r border-border p-4 md:block">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-4 h-8 w-full rounded-lg" />
        <Skeleton className="mt-3 h-8 w-full rounded-lg" />
        <Skeleton className="mt-3 h-8 w-full rounded-lg" />
        <Skeleton className="mt-6 h-4 w-24" />
        <Skeleton className="mt-3 h-20 w-full rounded-lg" />
      </div>

      {/* Map skeleton */}
      <div className="flex-1">
        <Skeleton className="h-full w-full rounded-none" />
      </div>
    </div>
  );
}
