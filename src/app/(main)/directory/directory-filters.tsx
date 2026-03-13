"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryState, parseAsString, parseAsInteger } from "nuqs";
import { SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type {
  IndustryWithSpecializations,
  AvailabilityTagType,
  DirectoryFilters,
} from "@/lib/types";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";

interface DirectoryFiltersBarProps {
  industries: IndustryWithSpecializations[];
  availabilityTags: AvailabilityTagType[];
  filters: DirectoryFilters;
}

export function DirectoryFiltersBar({
  industries,
  availabilityTags,
  filters,
}: DirectoryFiltersBarProps) {
  const t = useTranslations("directory");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showFilters, setShowFilters] = useState(false);

  // nuqs state bindings
  const [query, setQuery] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({ shallow: false, throttleMs: 500 })
  );
  const [industryId, setIndustryId] = useQueryState(
    "industry",
    parseAsString.withDefault("").withOptions({ shallow: false })
  );
  const [specializationId, setSpecializationId] = useQueryState(
    "specialization",
    parseAsString.withDefault("").withOptions({ shallow: false })
  );
  const [yearMin, setYearMin] = useQueryState(
    "yearMin",
    parseAsInteger.withOptions({ shallow: false })
  );
  const [yearMax, setYearMax] = useQueryState(
    "yearMax",
    parseAsInteger.withOptions({ shallow: false })
  );
  const [country, setCountry] = useQueryState(
    "country",
    parseAsString.withDefault("").withOptions({ shallow: false, throttleMs: 500 })
  );
  const [city, setCity] = useQueryState(
    "city",
    parseAsString.withDefault("").withOptions({ shallow: false, throttleMs: 500 })
  );
  const [sort, setSort] = useQueryState(
    "sort",
    parseAsString.withDefault("name").withOptions({ shallow: false })
  );
  const [, setPage] = useQueryState(
    "page",
    parseAsInteger.withOptions({ shallow: false })
  );

  // Get specializations for the selected industry
  const selectedIndustry = industries.find((i) => i.id === industryId);
  const specializations = selectedIndustry?.specializations ?? [];

  const hasActiveFilters = !!(
    query ||
    industryId ||
    specializationId ||
    yearMin ||
    yearMax ||
    country ||
    city
  );

  const clearAllFilters = useCallback(() => {
    startTransition(() => {
      router.push("/directory");
    });
  }, [router]);

  const activeFilterCount = [
    industryId,
    specializationId,
    yearMin,
    yearMax,
    country,
    city,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-3">
      {/* Search bar */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder={t("searchPlaceholder")}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value || null);
            setPage(null);
          }}
          className="h-10 rounded-xl pl-9 pr-4 text-sm"
          aria-label={t("searchAriaLabel")}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery(null);
              setPage(null);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={t("clearSearch")}
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter toggle + sort row */}
      <div className="flex items-center gap-2">
        <Button
          variant={showFilters ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-1.5"
        >
          <SlidersHorizontalIcon className="h-3.5 w-3.5" />
          {tc("filters")}
          {activeFilterCount > 0 && (
            <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="gap-1 text-muted-foreground"
          >
            <XIcon className="h-3.5 w-3.5" />
            {tc("clearAll")}
          </Button>
        )}

        <div className="ml-auto">
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value || null);
              setPage(null);
            }}
            className={selectClass + " min-w-[120px] sm:min-w-[140px]"}
            aria-label={tc("sortBy")}
          >
            <option value="name">{t("nameAZ")}</option>
            <option value="graduation_year">{t("graduationYear")}</option>
            <option value="recently_active">{t("recentlyActive")}</option>
          </select>
        </div>
      </div>

      {/* Expandable filters panel */}
      {showFilters && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Industry */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t("industry")}
            </label>
            <select
              value={industryId}
              onChange={(e) => {
                setIndustryId(e.target.value || null);
                setSpecializationId(null);
                setPage(null);
              }}
              className={selectClass}
            >
              <option value="">{t("allIndustries")}</option>
              {industries.map((ind) => (
                <option key={ind.id} value={ind.id}>
                  {ind.name}
                </option>
              ))}
            </select>
          </div>

          {/* Specialization */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t("specialization")}
            </label>
            <select
              value={specializationId}
              onChange={(e) => {
                setSpecializationId(e.target.value || null);
                setPage(null);
              }}
              disabled={!industryId}
              className={selectClass}
            >
              <option value="">
                {industryId ? t("allSpecializations") : t("selectIndustryFirst")}
              </option>
              {specializations.map((spec) => (
                <option key={spec.id} value={spec.id}>
                  {spec.name}
                </option>
              ))}
            </select>
          </div>

          {/* Graduation year range */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t("graduationYear")}
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder={t("from")}
                value={yearMin ?? ""}
                onChange={(e) => {
                  const val = e.target.value
                    ? parseInt(e.target.value, 10)
                    : null;
                  setYearMin(val);
                  setPage(null);
                }}
                min={1950}
                max={2100}
                className="h-8"
              />
              <span className="text-xs text-muted-foreground">&ndash;</span>
              <Input
                type="number"
                placeholder={t("to")}
                value={yearMax ?? ""}
                onChange={(e) => {
                  const val = e.target.value
                    ? parseInt(e.target.value, 10)
                    : null;
                  setYearMax(val);
                  setPage(null);
                }}
                min={1950}
                max={2100}
                className="h-8"
              />
            </div>
          </div>

          {/* Country */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t("country")}
            </label>
            <Input
              type="text"
              placeholder={t("countryPlaceholder")}
              value={country}
              onChange={(e) => {
                setCountry(e.target.value || null);
                setPage(null);
              }}
              className="h-8"
            />
          </div>

          {/* City */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t("city")}
            </label>
            <Input
              type="text"
              placeholder={t("cityPlaceholder")}
              value={city}
              onChange={(e) => {
                setCity(e.target.value || null);
                setPage(null);
              }}
              className="h-8"
            />
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {isPending && (
        <div className="h-0.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
        </div>
      )}
    </div>
  );
}
