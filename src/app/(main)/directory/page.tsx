import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { searchDirectory } from "@/lib/queries/directory";
import { getIndustriesWithSpecializations } from "@/lib/queries/taxonomy";
import { getAvailabilityTagTypes } from "@/lib/queries/availability-tags";
import { getConnectionStatusMap } from "@/lib/queries/connections";
import { filterDirectoryProfileForTier } from "@/lib/visibility";
import type { DirectoryFilters, ProfileVisibilityTier } from "@/lib/types";
import { DirectoryFiltersBar } from "./directory-filters";
import { DirectoryGrid } from "./directory-grid";
import { DirectoryPagination } from "./directory-pagination";
import { DirectoryEmptyState } from "./directory-empty-state";

export const metadata: Metadata = {
  title: "Alumni Directory — AlumNet",
  description: "Discover and connect with fellow alumni.",
};

interface DirectoryPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parseSearchParams(
  raw: Record<string, string | string[] | undefined>
): DirectoryFilters {
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

  const tags = raw["tags"];
  const availabilityTagIds = typeof tags === "string" && tags.trim()
    ? tags.split(",").filter(Boolean)
    : undefined;

  const sortBy = getString("sort") as DirectoryFilters["sortBy"] | undefined;
  const validSorts = ["relevance", "graduation_year", "name", "recently_active"];

  return {
    query: getString("q"),
    industryId: getString("industry"),
    specializationId: getString("specialization"),
    graduationYearMin: getNumber("yearMin"),
    graduationYearMax: getNumber("yearMax"),
    country: getString("country"),
    stateProvince: getString("state"),
    city: getString("city"),
    availabilityTagIds,
    sortBy: sortBy && validSorts.includes(sortBy) ? sortBy : undefined,
    sortOrder: getString("order") === "desc" ? "desc" : "asc",
    page: getNumber("page"),
    pageSize: 20,
  };
}

export default async function DirectoryPage({
  searchParams,
}: DirectoryPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Determine viewer's verification status
  const { data: currentUser } = await supabase
    .from("users")
    .select("verification_status")
    .eq("id", user.id)
    .single();

  const viewerTier: ProfileVisibilityTier =
    currentUser?.verification_status === "verified"
      ? "tier2_verified"
      : "tier1_unverified";

  const rawParams = await searchParams;
  const filters = parseSearchParams(rawParams);

  // Fetch directory results and filter options in parallel
  const [result, industries, availabilityTags] = await Promise.all([
    searchDirectory(filters),
    getIndustriesWithSpecializations(),
    getAvailabilityTagTypes(),
  ]);

  // Apply visibility tier filtering to directory profiles
  result.profiles = result.profiles.map((p) =>
    filterDirectoryProfileForTier(p, viewerTier)
  );

  // Fetch connection statuses for the profiles in the results
  const otherUserIds = result.profiles
    .map((p) => p.user_id)
    .filter((id) => id !== user.id);
  const connectionStatusMap = await getConnectionStatusMap(user.id, otherUserIds);
  // Convert Map to a plain object for serialization to client component
  const connectionStatuses: Record<string, "connected" | "pending_sent" | "pending_received"> =
    Object.fromEntries(connectionStatusMap);

  const hasActiveFilters = !!(
    filters.query ||
    filters.industryId ||
    filters.specializationId ||
    filters.graduationYearMin ||
    filters.graduationYearMax ||
    filters.country ||
    filters.stateProvince ||
    filters.city ||
    (filters.availabilityTagIds && filters.availabilityTagIds.length > 0)
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Alumni Directory
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Discover alumni by name, industry, graduation year, and more.
        </p>
      </div>

      {/* Unverified viewer banner */}
      {viewerTier === "tier1_unverified" && (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/50 px-4 py-3 text-center text-sm text-muted-foreground">
          <Link href="/verification" className="text-primary underline underline-offset-4">
            Verify your account
          </Link>{" "}
          to see full alumni profiles.
        </div>
      )}

      {/* Filters */}
      <DirectoryFiltersBar
        industries={industries}
        availabilityTags={availabilityTags}
        filters={filters}
      />

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
          alumni
        </p>
      )}

      {/* Results grid or empty state */}
      {result.profiles.length > 0 ? (
        <>
          <DirectoryGrid profiles={result.profiles} connectionStatuses={connectionStatuses} />
          {result.totalPages > 1 && (
            <DirectoryPagination
              currentPage={result.page}
              totalPages={result.totalPages}
            />
          )}
        </>
      ) : (
        <DirectoryEmptyState hasFilters={hasActiveFilters} />
      )}
    </div>
  );
}
