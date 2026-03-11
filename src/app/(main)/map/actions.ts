"use server";

import {
  getMapCountryData,
  getMapRegionData,
  getMapCityData,
} from "@/lib/queries/map";
import type {
  MapFilters,
  CountryMapData,
  RegionMapData,
  CityMapData,
} from "@/lib/types";

export async function fetchCountryData(
  filters: MapFilters
): Promise<CountryMapData[]> {
  return getMapCountryData(filters);
}

export async function fetchRegionData(
  country: string,
  filters: MapFilters
): Promise<RegionMapData[]> {
  return getMapRegionData(country, filters);
}

export async function fetchCityData(
  country: string,
  state: string | null,
  filters: MapFilters
): Promise<CityMapData[]> {
  return getMapCityData(country, state, filters);
}
