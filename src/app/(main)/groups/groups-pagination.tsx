"use client";

import { useQueryState, parseAsInteger } from "nuqs";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface GroupsPaginationProps {
  currentPage: number;
  totalPages: number;
}

export function GroupsPagination({
  currentPage,
  totalPages,
}: GroupsPaginationProps) {
  const [, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1).withOptions({ shallow: false })
  );

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className="flex items-center justify-center gap-1"
    >
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => setPage(1)}
        disabled={currentPage <= 1}
        aria-label="First page"
      >
        <ChevronsLeftIcon className="h-3.5 w-3.5" />
      </Button>

      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => setPage(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Previous page"
      >
        <ChevronLeftIcon className="h-3.5 w-3.5" />
      </Button>

      <div className="flex items-center gap-0.5">
        {pages.map((pageNum, idx) =>
          pageNum === null ? (
            <span
              key={`ellipsis-${idx}`}
              className="flex h-7 w-7 items-center justify-center text-xs text-muted-foreground"
            >
              ...
            </span>
          ) : (
            <Button
              key={pageNum}
              variant={pageNum === currentPage ? "default" : "ghost"}
              size="icon-xs"
              onClick={() => setPage(pageNum)}
              aria-label={`Page ${pageNum}`}
              aria-current={pageNum === currentPage ? "page" : undefined}
              className="h-7 w-7 text-xs"
            >
              {pageNum}
            </Button>
          )
        )}
      </div>

      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => setPage(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="Next page"
      >
        <ChevronRightIcon className="h-3.5 w-3.5" />
      </Button>

      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => setPage(totalPages)}
        disabled={currentPage >= totalPages}
        aria-label="Last page"
      >
        <ChevronsRightIcon className="h-3.5 w-3.5" />
      </Button>
    </nav>
  );
}

function getPageNumbers(
  current: number,
  total: number
): (number | null)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | null)[] = [];
  const rangeStart = Math.max(2, current - 1);
  const rangeEnd = Math.min(total - 1, current + 1);

  pages.push(1);
  if (rangeStart > 2) pages.push(null);
  for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
  if (rangeEnd < total - 1) pages.push(null);
  pages.push(total);

  return pages;
}
