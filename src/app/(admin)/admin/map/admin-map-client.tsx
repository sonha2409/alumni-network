"use client";

import { useState, useCallback, useTransition } from "react";
import dynamic from "next/dynamic";
import { Loader2Icon, EyeIcon, EyeOffIcon, TrendingUpIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  AdminCountryMapData,
  TrendDataPoint,
  RegionMapData,
  CityMapData,
  IndustryWithSpecializations,
  MapFilters,
  CountryMapData,
} from "@/lib/types";
import { MapSidebar } from "@/app/(main)/map/map-sidebar";
import type { ViewLevel } from "@/app/(main)/map/map-client";
import {
  fetchAdminCountryData,
  fetchAdminRegionData,
  fetchAdminCityData,
} from "./actions";

const MapView = dynamic(
  () => import("@/app/(main)/map/map-view").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-muted/30">
        <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

interface AdminMapClientProps {
  initialCountryData: AdminCountryMapData[];
  initialTrendData: TrendDataPoint[];
  industries: IndustryWithSpecializations[];
}

export function AdminMapClient({
  initialCountryData,
  initialTrendData,
  industries,
}: AdminMapClientProps) {
  const [includeUnverified, setIncludeUnverified] = useState(false);
  const [showTrends, setShowTrends] = useState(false);
  const [countryData, setCountryData] =
    useState<AdminCountryMapData[]>(initialCountryData);
  const [trendData] = useState(initialTrendData);
  const [viewLevel, setViewLevel] = useState<ViewLevel>("country");
  const [regionData, setRegionData] = useState<RegionMapData[]>([]);
  const [cityData, setCityData] = useState<CityMapData[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<{
    name: string;
    country: string;
    stateProvince?: string;
    alumniCount: number;
  } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentCountry, setCurrentCountry] = useState<string | null>(null);
  const [currentState, setCurrentState] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleToggleUnverified = useCallback(async () => {
    const newValue = !includeUnverified;
    setIncludeUnverified(newValue);

    startTransition(async () => {
      const data = await fetchAdminCountryData(newValue, {});
      setCountryData(data);
    });
  }, [includeUnverified]);

  // Compute trend badges per country
  const trendBadges = new Map<string, number>();
  if (showTrends) {
    // Sum recent month's new users per country
    const latestMonth = trendData[0]?.month;
    if (latestMonth) {
      for (const point of trendData) {
        if (point.month === latestMonth) {
          trendBadges.set(point.country, point.newUsers);
        }
      }
    }
  }

  // Convert AdminCountryMapData to CountryMapData for MapView
  const mapCountryData: CountryMapData[] = countryData.map((d) => ({
    country: d.country,
    alumniCount: d.alumniCount,
    latitude: d.latitude,
    longitude: d.longitude,
  }));

  const totalAlumni = countryData.reduce((s, c) => s + c.alumniCount, 0);
  const totalCountries = countryData.length;
  const totalVerified = countryData.reduce(
    (s, c) => s + c.verifiedCount,
    0
  );
  const totalUnverified = countryData.reduce(
    (s, c) => s + c.unverifiedCount,
    0
  );

  const handleCountryClick = useCallback(
    (country: CountryMapData) => {
      setCurrentCountry(country.country);
      setCurrentState(null);
      setSelectedRegion({
        name: country.country,
        country: country.country,
        alumniCount: country.alumniCount,
      });

      startTransition(async () => {
        const data = await fetchAdminRegionData(country.country, {});
        if (data.length > 0) {
          setRegionData(data);
          setViewLevel("region");
        } else {
          const cities = await fetchAdminCityData(country.country, null, {});
          if (cities.length > 0) {
            setCityData(cities);
            setViewLevel("city");
          }
        }
      });
    },
    []
  );

  const handleRegionClick = useCallback(
    (region: RegionMapData) => {
      if (!currentCountry) return;
      setCurrentState(region.stateProvince);
      setSelectedRegion({
        name: region.stateProvince,
        country: currentCountry,
        stateProvince: region.stateProvince,
        alumniCount: region.alumniCount,
      });

      startTransition(async () => {
        const data = await fetchAdminCityData(
          currentCountry,
          region.stateProvince,
          {}
        );
        if (data.length > 0) {
          setCityData(data);
          setViewLevel("city");
        }
      });
    },
    [currentCountry]
  );

  const handleCityClick = useCallback(
    (city: CityMapData) => {
      setSelectedRegion({
        name: city.city,
        country: currentCountry ?? "",
        stateProvince: currentState ?? undefined,
        alumniCount: city.alumniCount,
      });
    },
    [currentCountry, currentState]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Admin controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant={includeUnverified ? "secondary" : "outline"}
          size="sm"
          onClick={handleToggleUnverified}
          className="gap-1.5"
          disabled={isPending}
        >
          {includeUnverified ? (
            <EyeIcon className="h-3.5 w-3.5" />
          ) : (
            <EyeOffIcon className="h-3.5 w-3.5" />
          )}
          {includeUnverified ? "Showing all users" : "Verified only"}
        </Button>

        <Button
          variant={showTrends ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowTrends(!showTrends)}
          className="gap-1.5"
        >
          <TrendingUpIcon className="h-3.5 w-3.5" />
          Trends
        </Button>

        <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            Verified: <strong className="text-foreground">{totalVerified}</strong>
          </span>
          {includeUnverified && (
            <span>
              Unverified:{" "}
              <strong className="text-foreground">{totalUnverified}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Map container */}
      <div className="flex h-[calc(100vh-14rem)] overflow-hidden rounded-xl border border-border">
        <MapSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          industries={industries}
          onFiltersChange={() => {}}
          selectedRegion={selectedRegion}
          viewLevel={viewLevel}
          onBackToCountries={() => {
            setViewLevel("country");
            setCurrentCountry(null);
            setCurrentState(null);
            setSelectedRegion(null);
          }}
          onBackToRegions={() => {
            setViewLevel("region");
            setCurrentState(null);
            setSelectedRegion(null);
          }}
          totalAlumni={totalAlumni}
          totalCountries={totalCountries}
          isPending={isPending}
        />

        <div className="relative flex-1">
          {isPending && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
              <Loader2Icon className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          <MapView
            viewLevel={viewLevel}
            countryData={mapCountryData}
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
    </div>
  );
}
