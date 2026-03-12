"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  MapPinIcon,
  UsersIcon,
  GlobeIcon,
  ExternalLinkIcon,
  XIcon,
  SlidersHorizontalIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { IndustryWithSpecializations } from "@/lib/types";
import type { ViewLevel } from "./map-client";
import { MapFilters } from "./map-filters";

interface SelectedRegion {
  name: string;
  country: string;
  stateProvince?: string;
  alumniCount: number;
}

interface MapSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  industries: IndustryWithSpecializations[];
  onFiltersChange: () => void;
  selectedRegion: SelectedRegion | null;
  viewLevel: ViewLevel;
  onBackToCountries: () => void;
  onBackToRegions: () => void;
  totalAlumni: number;
  totalCountries: number;
  isPending: boolean;
}

function buildDirectoryLink(region: SelectedRegion, viewLevel: ViewLevel): string {
  const params = new URLSearchParams();
  params.set("country", region.country);
  if (viewLevel === "city" && region.stateProvince) {
    params.set("state", region.stateProvince);
  }
  if (viewLevel === "city") {
    params.set("city", region.name);
  }
  return `/directory?${params.toString()}`;
}

export function MapSidebar({
  isOpen,
  onToggle,
  industries,
  onFiltersChange,
  selectedRegion,
  viewLevel,
  onBackToCountries,
  onBackToRegions,
  totalAlumni,
  totalCountries,
  isPending,
}: MapSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden flex-shrink-0 border-r border-border bg-background transition-all duration-300 md:flex md:flex-col ${
          isOpen ? "w-80" : "w-0"
        }`}
      >
        <div className={`flex h-full flex-col overflow-y-auto ${isOpen ? "" : "invisible"}`}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Alumni Map</h2>
              <button
                onClick={onToggle}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close sidebar"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Overview stats */}
            <div className="grid grid-cols-2 gap-3 border-b border-border px-4 py-3">
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                <UsersIcon className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-lg font-bold leading-none">{totalAlumni}</p>
                  <p className="text-[11px] text-muted-foreground">Alumni</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                <GlobeIcon className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-lg font-bold leading-none">{totalCountries}</p>
                  <p className="text-[11px] text-muted-foreground">Countries</p>
                </div>
              </div>
            </div>

            {/* Breadcrumb navigation */}
            {viewLevel !== "country" && (
              <div className="border-b border-border px-4 py-2">
                <div className="flex items-center gap-1 text-xs">
                  <button
                    onClick={onBackToCountries}
                    className="text-primary hover:underline"
                  >
                    World
                  </button>
                  {viewLevel === "city" && (
                    <>
                      <ChevronRightIcon className="h-3 w-3 text-muted-foreground" />
                      <button
                        onClick={onBackToRegions}
                        className="text-primary hover:underline"
                      >
                        {selectedRegion?.country}
                      </button>
                    </>
                  )}
                  <ChevronRightIcon className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium text-foreground">
                    {selectedRegion?.name}
                  </span>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="border-b border-border px-4 py-3">
              <MapFilters
                industries={industries}
                onFiltersChange={onFiltersChange}
              />
            </div>

            {/* Selected region stats */}
            {selectedRegion && (
              <div className="flex-1 px-4 py-4">
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <MapPinIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{selectedRegion.name}</h3>
                      {viewLevel !== "country" && (
                        <p className="text-xs text-muted-foreground">
                          {selectedRegion.country}
                          {selectedRegion.stateProvince &&
                            viewLevel === "city" &&
                            ` / ${selectedRegion.stateProvince}`}
                        </p>
                      )}
                      <p className="mt-1 text-2xl font-bold text-primary">
                        {selectedRegion.alumniCount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedRegion.alumniCount === 1 ? "alumnus" : "alumni"} in this area
                      </p>
                    </div>
                  </div>

                  <Link
                    href={buildDirectoryLink(selectedRegion, viewLevel)}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    View in Directory
                    <ExternalLinkIcon className="h-3.5 w-3.5" />
                  </Link>

                  {viewLevel !== "country" && (
                    <button
                      onClick={viewLevel === "city" ? onBackToRegions : onBackToCountries}
                      className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <ArrowLeftIcon className="h-3.5 w-3.5" />
                      {viewLevel === "city" ? "Back to regions" : "Back to world"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {!selectedRegion && (
              <div className="flex-1 px-4 py-8 text-center">
                <MapPinIcon className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Click a location on the map to see details
                </p>
              </div>
            )}
          </div>
      </aside>

      {/* Collapsed sidebar toggle (desktop) */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-r-lg border border-l-0 border-border bg-background p-2 shadow-sm hover:bg-muted md:block"
          aria-label="Open sidebar"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      )}

      {/* Mobile bottom sheet trigger */}
      <div className="fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2 md:hidden">
        <Button
          size="sm"
          className="gap-1.5 rounded-full shadow-lg"
          onClick={() => setMobileOpen(true)}
        >
          <SlidersHorizontalIcon className="h-4 w-4" />
          Filters
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="gap-1.5 rounded-full shadow-lg"
          onClick={() => setMobileOpen(true)}
        >
          <MapPinIcon className="h-4 w-4" />
          {selectedRegion
            ? `${selectedRegion.name} · ${selectedRegion.alumniCount}`
            : `${totalAlumni} Alumni`}
        </Button>
      </div>

      {/* Mobile bottom sheet — always mounted to avoid MapFilters remount resetting drill-down */}
      <div
        className={`fixed inset-0 z-30 transition-opacity duration-200 md:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={`absolute bottom-0 left-0 right-0 max-h-[70vh] overflow-y-auto rounded-t-2xl border-t border-border bg-background transition-transform duration-200 ${
            mobileOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          {/* Drag handle */}
          <div className="flex justify-center py-2">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          <div className="flex items-center justify-between px-4 pb-2">
            <h2 className="text-sm font-semibold">Alumni Map</h2>
            <button
              onClick={() => setMobileOpen(false)}
              className="rounded-md p-1 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 border-b border-border px-4 pb-3">
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
              <UsersIcon className="h-4 w-4 text-primary" />
              <div>
                <p className="text-lg font-bold leading-none">{totalAlumni}</p>
                <p className="text-[11px] text-muted-foreground">Alumni</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
              <GlobeIcon className="h-4 w-4 text-primary" />
              <div>
                <p className="text-lg font-bold leading-none">{totalCountries}</p>
                <p className="text-[11px] text-muted-foreground">Countries</p>
              </div>
            </div>
          </div>

          {/* Breadcrumb */}
          {viewLevel !== "country" && (
            <div className="border-b border-border px-4 py-2">
              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={() => { onBackToCountries(); setMobileOpen(false); }}
                  className="text-primary hover:underline"
                >
                  World
                </button>
                {viewLevel === "city" && (
                  <>
                    <ChevronRightIcon className="h-3 w-3 text-muted-foreground" />
                    <button
                      onClick={() => { onBackToRegions(); setMobileOpen(false); }}
                      className="text-primary hover:underline"
                    >
                      {selectedRegion?.country}
                    </button>
                  </>
                )}
                <ChevronRightIcon className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium text-foreground">
                  {selectedRegion?.name}
                </span>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="border-b border-border px-4 py-3">
            <MapFilters
              industries={industries}
              onFiltersChange={onFiltersChange}
            />
          </div>

          {/* Selected region */}
          {selectedRegion && (
            <div className="px-4 py-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <MapPinIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{selectedRegion.name}</h3>
                    <p className="mt-1 text-2xl font-bold text-primary">
                      {selectedRegion.alumniCount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedRegion.alumniCount === 1 ? "alumnus" : "alumni"}
                    </p>
                  </div>
                </div>

                <Link
                  href={buildDirectoryLink(selectedRegion, viewLevel)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  onClick={() => setMobileOpen(false)}
                >
                  View in Directory
                  <ExternalLinkIcon className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Back buttons for mobile */}
          {viewLevel !== "country" && (
            <div className="px-4 pb-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => {
                  if (viewLevel === "city") {
                    onBackToRegions();
                  } else {
                    onBackToCountries();
                  }
                  setMobileOpen(false);
                }}
              >
                <ArrowLeftIcon className="h-3.5 w-3.5" />
                {viewLevel === "city" ? "Back to regions" : "Back to world"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
