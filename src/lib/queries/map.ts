import { createClient } from "@/lib/supabase/server";
import { getCountryCentroid } from "@/lib/geocoding";
import type {
  MapFilters,
  CountryMapData,
  RegionMapData,
  CityMapData,
  AdminCountryMapData,
  TrendDataPoint,
} from "@/lib/types";

/**
 * Build the JSONB filters parameter for map RPC functions.
 */
function buildFiltersParam(filters: MapFilters): Record<string, string> {
  const param: Record<string, string> = {};
  if (filters.industryId) param.industry_id = filters.industryId;
  if (filters.specializationId) param.specialization_id = filters.specializationId;
  if (filters.graduationYearMin) param.year_min = String(filters.graduationYearMin);
  if (filters.graduationYearMax) param.year_max = String(filters.graduationYearMax);
  return param;
}

/**
 * Fetch country-level alumni counts for the map (verified users only).
 * Falls back to static centroid lookup if DB coordinates are null.
 */
export async function getMapCountryData(
  filters: MapFilters
): Promise<CountryMapData[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_map_country_counts", {
    p_filters: buildFiltersParam(filters),
  });

  if (error) {
    console.error("[Query:getMapCountryData]", { error: error.message });
    return [];
  }

  return (data ?? []).map(
    (row: { country: string; alumni_count: number; latitude: number | null; longitude: number | null }) => {
      // Use DB coordinates if available, otherwise fall back to static lookup
      const centroid = getCountryCentroid(row.country);
      return {
        country: row.country,
        alumniCount: row.alumni_count,
        latitude: row.latitude ?? centroid?.latitude ?? 0,
        longitude: row.longitude ?? centroid?.longitude ?? 0,
      };
    }
  );
}

/**
 * Fetch state/province-level alumni counts within a country.
 */
export async function getMapRegionData(
  country: string,
  filters: MapFilters
): Promise<RegionMapData[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_map_region_counts", {
    p_country: country,
    p_filters: buildFiltersParam(filters),
  });

  if (error) {
    console.error("[Query:getMapRegionData]", { country, error: error.message });
    return [];
  }

  return (data ?? [])
    .filter(
      (row: { avg_latitude: number | null; avg_longitude: number | null }) =>
        row.avg_latitude != null && row.avg_longitude != null
    )
    .map(
      (row: {
        state_province: string;
        alumni_count: number;
        avg_latitude: number;
        avg_longitude: number;
      }) => ({
        stateProvince: row.state_province,
        alumniCount: row.alumni_count,
        avgLatitude: row.avg_latitude,
        avgLongitude: row.avg_longitude,
      })
    );
}

/**
 * Fetch city-level alumni counts within a country/state.
 */
export async function getMapCityData(
  country: string,
  state: string | null,
  filters: MapFilters
): Promise<CityMapData[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_map_city_counts", {
    p_country: country,
    p_state: state,
    p_filters: buildFiltersParam(filters),
  });

  if (error) {
    console.error("[Query:getMapCityData]", { country, state, error: error.message });
    return [];
  }

  return (data ?? [])
    .filter(
      (row: { avg_latitude: number | null; avg_longitude: number | null }) =>
        row.avg_latitude != null && row.avg_longitude != null
    )
    .map(
      (row: {
        city: string;
        alumni_count: number;
        avg_latitude: number;
        avg_longitude: number;
      }) => ({
        city: row.city,
        alumniCount: row.alumni_count,
        avgLatitude: row.avg_latitude,
        avgLongitude: row.avg_longitude,
      })
    );
}

/**
 * Fetch country-level data for admin map (includes unverified toggle).
 */
export async function getMapCountryDataAdmin(
  includeUnverified: boolean,
  filters: MapFilters
): Promise<AdminCountryMapData[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_map_country_counts_admin", {
    p_include_unverified: includeUnverified,
    p_filters: buildFiltersParam(filters),
  });

  if (error) {
    console.error("[Query:getMapCountryDataAdmin]", { error: error.message });
    return [];
  }

  return (data ?? []).map(
    (row: {
      country: string;
      alumni_count: number;
      verified_count: number;
      unverified_count: number;
      latitude: number | null;
      longitude: number | null;
    }) => {
      const centroid = getCountryCentroid(row.country);
      return {
        country: row.country,
        alumniCount: row.alumni_count,
        verifiedCount: row.verified_count,
        unverifiedCount: row.unverified_count,
        latitude: row.latitude ?? centroid?.latitude ?? 0,
        longitude: row.longitude ?? centroid?.longitude ?? 0,
      };
    }
  );
}

/**
 * Fetch monthly new-user trend data per country (admin only).
 */
export async function getMapTrendData(
  country?: string,
  months?: number
): Promise<TrendDataPoint[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_map_trend_data", {
    p_country: country ?? null,
    p_months: months ?? 6,
  });

  if (error) {
    console.error("[Query:getMapTrendData]", { error: error.message });
    return [];
  }

  return (data ?? []).map(
    (row: { country: string; month: string; new_users: number }) => ({
      country: row.country,
      month: row.month,
      newUsers: row.new_users,
    })
  );
}
