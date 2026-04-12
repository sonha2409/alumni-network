"use client";

import { useState, useCallback, useTransition, useRef } from "react";
import dynamic from "next/dynamic";
import { useQueryState, parseAsString, parseAsInteger } from "nuqs";
import { Loader2Icon } from "lucide-react";

import type {
  CountryMapData,
  RegionMapData,
  CityMapData,
  IndustryWithSpecializations,
  MapFilters,
} from "@/lib/types";
import { fetchCountryData, fetchRegionData, fetchCityData } from "./actions";
import { MapSidebar } from "./map-sidebar";

// Dynamic import to avoid SSR issues with mapbox-gl (requires window/document)
const MapView = dynamic(() => import("./map-view").then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted/30">
      <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

export type ViewLevel = "country" | "region" | "city";

interface SelectedRegion {
  type: "country" | "state" | "city";
  name: string;
  country: string;
  stateProvince?: string;
  alumniCount: number;
}

interface MapClientProps {
  initialCountryData: CountryMapData[];
  industries: IndustryWithSpecializations[];
}

export function MapClient({ initialCountryData, industries }: MapClientProps) {
  const [viewLevel, setViewLevel] = useState<ViewLevel>("country");
  const [countryData, setCountryData] = useState(initialCountryData);
  const [regionData, setRegionData] = useState<RegionMapData[]>([]);
  const [cityData, setCityData] = useState<CityMapData[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<SelectedRegion | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Current drill-down context
  const [currentCountry, setCurrentCountry] = useState<string | null>(null);
  const [currentState, setCurrentState] = useState<string | null>(null);

  // Filter state via nuqs (URL state)
  const [industryId] = useQueryState(
    "industry",
    parseAsString.withDefault("").withOptions({ shallow: true })
  );
  const [specializationId] = useQueryState(
    "specialization",
    parseAsString.withDefault("").withOptions({ shallow: true })
  );
  const [yearMin] = useQueryState(
    "yearMin",
    parseAsInteger.withOptions({ shallow: true })
  );
  const [yearMax] = useQueryState(
    "yearMax",
    parseAsInteger.withOptions({ shallow: true })
  );

  const buildFilters = useCallback((): MapFilters => {
    const filters: MapFilters = {};
    if (industryId) filters.industryId = industryId;
    if (specializationId) filters.specializationId = specializationId;
    if (yearMin) filters.graduationYearMin = yearMin;
    if (yearMax) filters.graduationYearMax = yearMax;
    return filters;
  }, [industryId, specializationId, yearMin, yearMax]);

  // Track last applied filters to skip duplicate calls (e.g. from multiple MapFilters mounts)
  const lastAppliedFilters = useRef<string>("");

  // Refresh data at current view level when filters change
  const handleFiltersChange = useCallback(() => {
    const filters = buildFilters();
    const filterKey = JSON.stringify(filters);

    // Skip if filters haven't actually changed (prevents reset on component mount)
    if (filterKey === lastAppliedFilters.current) return;
    lastAppliedFilters.current = filterKey;

    startTransition(async () => {
      if (viewLevel === "country") {
        const data = await fetchCountryData(filters);
        setCountryData(data);
      } else if (viewLevel === "region" && currentCountry) {
        const data = await fetchRegionData(currentCountry, filters);
        setRegionData(data);
      } else if (viewLevel === "city" && currentCountry) {
        const data = await fetchCityData(currentCountry, currentState, filters);
        setCityData(data);
      }
      setSelectedRegion(null);
    });
  }, [buildFilters, viewLevel, currentCountry, currentState]);

  // Drill-down handlers
  const handleCountryClick = useCallback(
    (country: CountryMapData) => {
      const filters = buildFilters();
      setCurrentCountry(country.country);
      setCurrentState(null);
      setSelectedRegion({
        type: "country",
        name: country.country,
        country: country.country,
        alumniCount: country.alumniCount,
      });

      startTransition(async () => {
        const data = await fetchRegionData(country.country, filters);
        if (data.length > 0) {
          setRegionData(data);
          setViewLevel("region");
        } else {
          // No state-level data, try city-level directly
          const cities = await fetchCityData(country.country, null, filters);
          if (cities.length > 0) {
            setCityData(cities);
            setViewLevel("city");
          }
        }
      });
    },
    [buildFilters]
  );

  const handleRegionClick = useCallback(
    (region: RegionMapData) => {
      if (!currentCountry) return;
      const filters = buildFilters();
      setCurrentState(region.stateProvince);
      setSelectedRegion({
        type: "state",
        name: region.stateProvince,
        country: currentCountry,
        stateProvince: region.stateProvince,
        alumniCount: region.alumniCount,
      });

      startTransition(async () => {
        const data = await fetchCityData(
          currentCountry,
          region.stateProvince,
          filters
        );
        if (data.length > 0) {
          setCityData(data);
          setViewLevel("city");
        }
      });
    },
    [currentCountry, buildFilters]
  );

  const handleCityClick = useCallback(
    (city: CityMapData) => {
      setSelectedRegion({
        type: "city",
        name: city.city,
        country: currentCountry ?? "",
        stateProvince: currentState ?? undefined,
        alumniCount: city.alumniCount,
      });
    },
    [currentCountry, currentState]
  );

  const handleBackToCountries = useCallback(() => {
    setViewLevel("country");
    setCurrentCountry(null);
    setCurrentState(null);
    setSelectedRegion(null);
    setRegionData([]);
    setCityData([]);
  }, []);

  const handleBackToRegions = useCallback(() => {
    setViewLevel("region");
    setCurrentState(null);
    setSelectedRegion(null);
    setCityData([]);
  }, []);

  // Compute total alumni for stats
  const totalAlumni = countryData.reduce((sum, c) => sum + c.alumniCount, 0);
  const totalCountries = countryData.length;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden">
      {/* Sidebar */}
      <MapSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        industries={industries}
        onFiltersChange={handleFiltersChange}
        selectedRegion={selectedRegion}
        viewLevel={viewLevel}
        onBackToCountries={handleBackToCountries}
        onBackToRegions={handleBackToRegions}
        totalAlumni={totalAlumni}
        totalCountries={totalCountries}
        isPending={isPending}
      />

      {/* Map */}
      <div className="relative flex-1">
        {isPending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
            <Loader2Icon className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <MapView
          viewLevel={viewLevel}
          countryData={countryData}
          regionData={regionData}
          cityData={cityData}
          onCountryClick={handleCountryClick}
          onRegionClick={handleRegionClick}
          onCityClick={handleCityClick}
          selectedRegion={selectedRegion}
          currentCountry={currentCountry}
        />
      </div>
    </div>
  );
}
