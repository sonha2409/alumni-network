import { Skeleton } from "@/components/ui/skeleton";

export default function MessagesLoading() {
  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-lg border bg-background shadow-sm md:flex-row">
      {/* Conversation list skeleton */}
      <div className="w-full border-r md:w-80 lg:w-96">
        <div className="border-b px-4 py-3">
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="space-y-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b px-4 py-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty chat area skeleton */}
      <div className="hidden flex-1 items-center justify-center md:flex">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    </div>
  );
}
