"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryState, parseAsString, parseAsInteger } from "nuqs";
import { SearchIcon, XIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { GroupFilters, GroupType } from "@/lib/types";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";

const groupTypeOptions: { value: GroupType; label: string }[] = [
  { value: "year_based", label: "Year-based" },
  { value: "field_based", label: "Field-based" },
  { value: "location_based", label: "Location-based" },
  { value: "custom", label: "Custom" },
];

interface GroupsFiltersBarProps {
  filters: GroupFilters;
}

export function GroupsFiltersBar({ filters }: GroupsFiltersBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({ shallow: false, throttleMs: 500 })
  );
  const [type, setType] = useQueryState(
    "type",
    parseAsString.withDefault("").withOptions({ shallow: false })
  );
  const [, setPage] = useQueryState(
    "page",
    parseAsInteger.withOptions({ shallow: false })
  );

  const hasActiveFilters = !!(query || type);

  const clearAllFilters = useCallback(() => {
    startTransition(() => {
      router.push("/groups");
    });
  }, [router]);

  return (
    <div className="flex flex-col gap-3">
      {/* Search bar */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search groups by name..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value || null);
            setPage(null);
          }}
          className="h-10 rounded-xl pl-9 pr-4 text-sm"
          aria-label="Search groups"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery(null);
              setPage(null);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Type filter + clear row */}
      <div className="flex items-center gap-2">
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value || null);
            setPage(null);
          }}
          className={selectClass + " max-w-[180px]"}
          aria-label="Filter by group type"
        >
          <option value="">All types</option>
          {groupTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="gap-1 text-muted-foreground"
          >
            <XIcon className="h-3.5 w-3.5" />
            Clear all
          </Button>
        )}
      </div>

      {/* Loading indicator */}
      {isPending && (
        <div className="h-0.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
        </div>
      )}
    </div>
  );
}
