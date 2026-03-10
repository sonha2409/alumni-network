"use client";

import { useQueryState, parseAsString, parseAsInteger } from "nuqs";
import { SearchIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

export function MemberFilters() {
  const [query, setQuery] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({ shallow: false, throttleMs: 500 })
  );
  const [, setPage] = useQueryState(
    "page",
    parseAsInteger.withOptions({ shallow: false })
  );

  return (
    <div className="relative">
      <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search members by name..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value || null);
          setPage(null);
        }}
        className="h-9 rounded-xl pl-9 pr-4 text-sm"
        aria-label="Search group members"
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
  );
}
