"use client";

import { useRouter } from "next/navigation";
import { SearchIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DirectoryEmptyStateProps {
  hasFilters: boolean;
}

export function DirectoryEmptyState({ hasFilters }: DirectoryEmptyStateProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        {hasFilters ? (
          <SearchIcon className="h-5 w-5 text-muted-foreground" />
        ) : (
          <UsersIcon className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      <h3 className="mt-4 text-sm font-semibold">
        {hasFilters ? "No alumni found" : "No alumni yet"}
      </h3>

      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        {hasFilters
          ? "Try adjusting your search or filters to find what you're looking for."
          : "Be the first to create a profile and start building the alumni network."}
      </p>

      {hasFilters && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => router.push("/directory")}
        >
          Clear all filters
        </Button>
      )}
    </div>
  );
}
