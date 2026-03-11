"use server";

import {
  getMapCountryDataAdmin,
  getMapRegionData,
  getMapCityData,
} from "@/lib/queries/map";
import type {
  MapFilters,
  AdminCountryMapData,
  RegionMapData,
  CityMapData,
} from "@/lib/types";

export async function fetchAdminCountryData(
  includeUnverified: boolean,
  filters: MapFilters
): Promise<AdminCountryMapData[]> {
  return getMapCountryDataAdmin(includeUnverified, filters);
}

export async function fetchAdminRegionData(
  country: string,
  filters: MapFilters
): Promise<RegionMapData[]> {
  return getMapRegionData(country, filters);
}

export async function fetchAdminCityData(
  country: string,
  state: string | null,
  filters: MapFilters
): Promise<CityMapData[]> {
  return getMapCityData(country, state, filters);
}
