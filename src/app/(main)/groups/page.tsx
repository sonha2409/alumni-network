import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { getGroups } from "@/lib/queries/groups";
import type { GroupFilters, GroupType } from "@/lib/types";
import { GroupsGrid } from "./groups-grid";
import { GroupsFiltersBar } from "./groups-filters";
import { GroupsPagination } from "./groups-pagination";
import { GroupsEmptyState } from "./groups-empty-state";
import { CreateGroupDialog } from "./create-group-dialog";

export const metadata: Metadata = {
  title: "Groups — AlumNet",
  description: "Browse and join alumni groups by year, field, or location.",
};

interface GroupsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parseSearchParams(
  raw: Record<string, string | string[] | undefined>
): GroupFilters {
  const getString = (key: string): string | undefined => {
    const val = raw[key];
    return typeof val === "string" && val.trim() ? val.trim() : undefined;
  };

  const getNumber = (key: string): number | undefined => {
    const val = getString(key);
    if (!val) return undefined;
    const num = parseInt(val, 10);
    return Number.isFinite(num) ? num : undefined;
  };

  const typeVal = getString("type") as GroupType | undefined;
  const validTypes: GroupType[] = ["year_based", "field_based", "location_based", "custom"];

  return {
    search: getString("q"),
    type: typeVal && validTypes.includes(typeVal) ? typeVal : undefined,
    page: getNumber("page"),
    pageSize: 12,
  };
}

export default async function GroupsPage({ searchParams }: GroupsPageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get viewer info
  const { data: currentUser } = await supabase
    .from("users")
    .select("verification_status, role")
    .eq("id", user.id)
    .single();

  const isVerified = currentUser?.verification_status === "verified";
  const isAdmin = currentUser?.role === "admin";

  const rawParams = await searchParams;
  const filters = parseSearchParams(rawParams);

  const result = await getGroups(filters, user.id);

  const hasActiveFilters = !!(filters.search || filters.type);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Groups</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse alumni groups by graduation year, career field, location, and more.
          </p>
        </div>
        {isAdmin && <CreateGroupDialog />}
      </div>

      {/* Unverified banner */}
      {!isVerified && (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/50 px-4 py-3 text-center text-sm text-muted-foreground">
          <Link href="/verification" className="text-primary underline underline-offset-4">
            Verify your account
          </Link>{" "}
          to join groups and connect with fellow alumni.
        </div>
      )}

      {/* Filters */}
      <GroupsFiltersBar filters={filters} />

      {/* Results count */}
      {result.totalCount > 0 && (
        <p className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-medium text-foreground">
            {(result.page - 1) * result.pageSize + 1}
            &ndash;
            {Math.min(result.page * result.pageSize, result.totalCount)}
          </span>{" "}
          of{" "}
          <span className="font-medium text-foreground">
            {result.totalCount}
          </span>{" "}
          groups
        </p>
      )}

      {/* Groups grid or empty state */}
      {result.groups.length > 0 ? (
        <>
          <GroupsGrid groups={result.groups} isVerified={isVerified} />
          {result.totalPages > 1 && (
            <GroupsPagination
              currentPage={result.page}
              totalPages={result.totalPages}
            />
          )}
        </>
      ) : (
        <GroupsEmptyState hasFilters={hasActiveFilters} />
      )}
    </div>
  );
}
