"use client";

import Link from "next/link";
import { useQueryState, parseAsInteger } from "nuqs";
import {
  BriefcaseIcon,
  MapPinIcon,
  GraduationCapIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DirectoryProfile } from "@/lib/types";

interface MemberListProps {
  members: DirectoryProfile[];
  currentPage: number;
  totalPages: number;
}

export function MemberList({ members, currentPage, totalPages }: MemberListProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <MemberCard key={member.id} profile={member} />
        ))}
      </div>

      {totalPages > 1 && (
        <MemberPagination currentPage={currentPage} totalPages={totalPages} />
      )}
    </div>
  );
}

function MemberCard({ profile }: { profile: DirectoryProfile }) {
  const location = [profile.city, profile.state_province, profile.country]
    .filter(Boolean)
    .join(", ");

  const initials = profile.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      href={`/profile/${profile.id}`}
      className="group relative flex flex-col rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-foreground/20 hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20"
    >
      <div className="flex items-start gap-3.5">
        <div className="relative shrink-0">
          {profile.photo_url ? (
            <img
              src={profile.photo_url}
              alt=""
              className="h-12 w-12 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground ring-1 ring-border">
              {initials}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold leading-tight text-foreground group-hover:text-primary transition-colors">
            {profile.full_name}
          </h3>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <GraduationCapIcon className="h-3 w-3 shrink-0" />
            <span>Class of {profile.graduation_year}</span>
          </div>
        </div>
      </div>

      {(profile.current_job_title || profile.current_company) && (
        <div className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
          <BriefcaseIcon className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="line-clamp-2">
            {profile.current_job_title && profile.current_company
              ? `${profile.current_job_title} at ${profile.current_company}`
              : profile.current_job_title || profile.current_company}
          </span>
        </div>
      )}

      {profile.primary_industry && (
        <div className="mt-2">
          <span className="inline-block rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
            {profile.primary_industry.name}
            {profile.primary_specialization &&
              ` · ${profile.primary_specialization.name}`}
          </span>
        </div>
      )}

      {location && (
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPinIcon className="h-3 w-3 shrink-0" />
          <span className="truncate">{location}</span>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/0 to-transparent transition-all group-hover:via-primary/30" />
    </Link>
  );
}

function MemberPagination({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  const [, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1).withOptions({ shallow: false })
  );

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav
      role="navigation"
      aria-label="Members pagination"
      className="flex items-center justify-center gap-1"
    >
      <Button variant="ghost" size="icon-xs" onClick={() => setPage(1)} disabled={currentPage <= 1} aria-label="First page">
        <ChevronsLeftIcon className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon-xs" onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1} aria-label="Previous page">
        <ChevronLeftIcon className="h-3.5 w-3.5" />
      </Button>

      <div className="flex items-center gap-0.5">
        {pages.map((pageNum, idx) =>
          pageNum === null ? (
            <span key={`ellipsis-${idx}`} className="flex h-7 w-7 items-center justify-center text-xs text-muted-foreground">...</span>
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

      <Button variant="ghost" size="icon-xs" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= totalPages} aria-label="Next page">
        <ChevronRightIcon className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon-xs" onClick={() => setPage(totalPages)} disabled={currentPage >= totalPages} aria-label="Last page">
        <ChevronsRightIcon className="h-3.5 w-3.5" />
      </Button>
    </nav>
  );
}

function getPageNumbers(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
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
