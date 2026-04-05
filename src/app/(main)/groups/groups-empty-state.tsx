"use client";

import { useRouter } from "next/navigation";
import { SearchIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GroupsEmptyStateProps {
  hasFilters: boolean;
}

export function GroupsEmptyState({ hasFilters }: GroupsEmptyStateProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-primary/15 bg-gradient-to-b from-primary/[0.02] to-transparent py-16 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
        {hasFilters ? (
          <SearchIcon className="h-5 w-5 text-primary/50" />
        ) : (
          <UsersIcon className="h-5 w-5 text-primary/50" />
        )}
      </div>

      <h3 className="mt-4 text-sm font-semibold">
        {hasFilters ? "No groups found" : "No groups yet"}
      </h3>

      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        {hasFilters
          ? "Try adjusting your search or filters to find what you're looking for."
          : "Groups will appear here once an admin creates them."}
      </p>

      {hasFilters && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => router.push("/groups")}
        >
          Clear all filters
        </Button>
      )}
    </div>
  );
}
