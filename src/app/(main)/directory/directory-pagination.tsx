"use client";

import { useQueryState, parseAsInteger } from "nuqs";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DirectoryPaginationProps {
  currentPage: number;
  totalPages: number;
}

export function DirectoryPagination({
  currentPage,
  totalPages,
}: DirectoryPaginationProps) {
  const [, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1).withOptions({ shallow: false })
  );

  // Generate page numbers to display
  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className="flex items-center justify-center gap-1"
    >
      {/* First page */}
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => setPage(1)}
        disabled={currentPage <= 1}
        aria-label="First page"
      >
        <ChevronsLeftIcon className="h-3.5 w-3.5" />
      </Button>

      {/* Previous */}
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => setPage(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Previous page"
      >
        <ChevronLeftIcon className="h-3.5 w-3.5" />
      </Button>

      {/* Page numbers */}
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

      {/* Next */}
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => setPage(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="Next page"
      >
        <ChevronRightIcon className="h-3.5 w-3.5" />
      </Button>

      {/* Last page */}
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

/**
 * Generate a smart page number array with ellipsis.
 * Shows: first, last, current ±1, with ellipsis for gaps.
 */
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

  // Always show first page
  pages.push(1);

  // Ellipsis after first if needed
  if (rangeStart > 2) {
    pages.push(null);
  }

  // Middle range
  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i);
  }

  // Ellipsis before last if needed
  if (rangeEnd < total - 1) {
    pages.push(null);
  }

  // Always show last page
  pages.push(total);

  return pages;
}
