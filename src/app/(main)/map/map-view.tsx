"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import Map, {
  Source,
  Layer,
  Popup,
  NavigationControl,
  FullscreenControl,
  type MapRef,
  type MapMouseEvent,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

import type {
  CountryMapData,
  RegionMapData,
  CityMapData,
} from "@/lib/types";
import type { ViewLevel } from "./map-client";
import { MapLegend } from "./map-legend";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const LIGHT_STYLE = "mapbox://styles/mapbox/light-v11";
const DARK_STYLE = "mapbox://styles/mapbox/dark-v11";

// Color scale for choropleth (5 buckets)
const CHOROPLETH_COLORS = [
  "#dbeafe", // lightest blue
  "#93c5fd",
  "#3b82f6",
  "#1d4ed8",
  "#1e3a5f", // darkest blue
];

// Bubble color
const BUBBLE_COLOR = "#3b82f6";
const BUBBLE_STROKE = "#1d4ed8";

interface MapViewProps {
  viewLevel: ViewLevel;
  countryData: CountryMapData[];
  regionData: RegionMapData[];
  cityData: CityMapData[];
  onCountryClick: (country: CountryMapData) => void;
  onRegionClick: (region: RegionMapData) => void;
  onCityClick: (city: CityMapData) => void;
  selectedRegion: { name: string; country: string; alumniCount: number } | null;
  currentCountry: string | null;
}

interface HoverInfo {
  longitude: number;
  latitude: number;
  name: string;
  count: number;
}

function useDarkMode(): boolean {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check for .dark class on html element
    const check = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    check();

    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Also listen for system preference
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => check();
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return isDark;
}

function getQuantileBuckets(data: { alumniCount: number }[]): number[] {
  if (data.length === 0) return [0, 1, 2, 5, 10];
  const counts = data.map((d) => d.alumniCount).sort((a, b) => a - b);
  const max = counts[counts.length - 1];
  if (max <= 5) return [1, 2, 3, 4, 5];
  // Create roughly even quintile breaks
  const step = max / 5;
  return [
    Math.ceil(step),
    Math.ceil(step * 2),
    Math.ceil(step * 3),
    Math.ceil(step * 4),
    max,
  ];
}

function buildCountryGeoJSON(data: CountryMapData[]) {
  return {
    type: "FeatureCollection" as const,
    features: data
      .filter((d) => d.latitude !== 0 && d.longitude !== 0)
      .map((d) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [d.longitude, d.latitude],
        },
        properties: {
          name: d.country,
          count: d.alumniCount,
        },
      })),
  };
}

function buildBubbleGeoJSON(
  data: { name: string; count: number; lat: number; lng: number }[]
) {
  return {
    type: "FeatureCollection" as const,
    features: data
      .filter((d) => d.lat !== 0 && d.lng !== 0)
      .map((d) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [d.lng, d.lat],
        },
        properties: {
          name: d.name,
          count: d.count,
        },
      })),
  };
}

export function MapView({
  viewLevel,
  countryData,
  regionData,
  cityData,
  onCountryClick,
  onRegionClick,
  onCityClick,
  currentCountry,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const isDark = useDarkMode();
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const buckets = getQuantileBuckets(countryData);

  // Build GeoJSON sources
  const countryGeoJSON = buildCountryGeoJSON(countryData);

  const regionBubbleData = regionData.map((r) => ({
    name: r.stateProvince,
    count: r.alumniCount,
    lat: r.avgLatitude,
    lng: r.avgLongitude,
  }));

  const cityBubbleData = cityData.map((c) => ({
    name: c.city,
    count: c.alumniCount,
    lat: c.avgLatitude,
    lng: c.avgLongitude,
  }));

  const activeBubbleData =
    viewLevel === "region"
      ? regionBubbleData
      : viewLevel === "city"
        ? cityBubbleData
        : [];

  const bubbleGeoJSON = buildBubbleGeoJSON(activeBubbleData);

  // Fly to location on drill-down
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (viewLevel === "country") {
      map.flyTo({
        center: [20, 20],
        zoom: 1.5,
        duration: 1500,
      });
    } else if (viewLevel === "region" && currentCountry) {
      // Fly to the centroid of the region data or country
      const points = regionData.filter(
        (r) => r.avgLatitude !== 0 && r.avgLongitude !== 0
      );
      if (points.length > 0) {
        const avgLat =
          points.reduce((s, p) => s + p.avgLatitude, 0) / points.length;
        const avgLng =
          points.reduce((s, p) => s + p.avgLongitude, 0) / points.length;
        map.flyTo({
          center: [avgLng, avgLat],
          zoom: 4.5,
          duration: 1500,
        });
      }
    } else if (viewLevel === "city") {
      const points = cityData.filter(
        (c) => c.avgLatitude !== 0 && c.avgLongitude !== 0
      );
      if (points.length > 0) {
        const avgLat =
          points.reduce((s, p) => s + p.avgLatitude, 0) / points.length;
        const avgLng =
          points.reduce((s, p) => s + p.avgLongitude, 0) / points.length;
        map.flyTo({
          center: [avgLng, avgLat],
          zoom: 6,
          duration: 1500,
        });
      }
    }
  }, [viewLevel, regionData, cityData, currentCountry]);

  const handleCountryLayerClick = useCallback(
    (e: MapMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature?.properties) return;
      const name = feature.properties.name as string;
      const match = countryData.find((c) => c.country === name);
      if (match) onCountryClick(match);
    },
    [countryData, onCountryClick]
  );

  const handleBubbleClick = useCallback(
    (e: MapMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature?.properties) return;
      const name = feature.properties.name as string;

      if (viewLevel === "region") {
        const match = regionData.find((r) => r.stateProvince === name);
        if (match) onRegionClick(match);
      } else if (viewLevel === "city") {
        const match = cityData.find((c) => c.city === name);
        if (match) onCityClick(match);
      }
    },
    [viewLevel, regionData, cityData, onRegionClick, onCityClick]
  );

  const handleMouseEnter = useCallback(
    (e: MapMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature?.properties) return;
      const map = mapRef.current;
      if (map) map.getCanvas().style.cursor = "pointer";
      setHoverInfo({
        longitude: e.lngLat.lng,
        latitude: e.lngLat.lat,
        name: feature.properties.name as string,
        count: feature.properties.count as number,
      });
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    const map = mapRef.current;
    if (map) map.getCanvas().style.cursor = "";
    setHoverInfo(null);
  }, []);

  // Circle radius: proportional to log(count)
  const circleRadiusExpression: mapboxgl.Expression = [
    "interpolate",
    ["linear"],
    ["get", "count"],
    1,
    8,
    10,
    16,
    50,
    24,
    100,
    32,
    500,
    44,
  ];

  // Country dot size based on alumni count
  const countryCircleRadius: mapboxgl.Expression = [
    "interpolate",
    ["linear"],
    ["get", "count"],
    1,
    6,
    buckets[0],
    10,
    buckets[1],
    15,
    buckets[2],
    20,
    buckets[3],
    28,
    buckets[4],
    36,
  ];

  // Country dot color based on alumni count
  const countryCircleColor: mapboxgl.Expression = [
    "step",
    ["get", "count"],
    CHOROPLETH_COLORS[0],
    buckets[0],
    CHOROPLETH_COLORS[1],
    buckets[1],
    CHOROPLETH_COLORS[2],
    buckets[2],
    CHOROPLETH_COLORS[3],
    buckets[3],
    CHOROPLETH_COLORS[4],
  ];

  return (
    <div className="h-full w-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: 20,
          latitude: 20,
          zoom: 1.5,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={isDark ? DARK_STYLE : LIGHT_STYLE}
        interactiveLayerIds={
          viewLevel === "country"
            ? ["country-circles"]
            : ["bubble-circles"]
        }
        onClick={
          viewLevel === "country"
            ? handleCountryLayerClick
            : handleBubbleClick
        }
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <NavigationControl position="top-right" />
        <FullscreenControl position="top-right" />

        {/* Country-level circles (choropleth dots) */}
        {viewLevel === "country" && (
          <Source
            id="country-data"
            type="geojson"
            data={countryGeoJSON}
          >
            <Layer
              id="country-circles"
              type="circle"
              paint={{
                "circle-radius": countryCircleRadius,
                "circle-color": countryCircleColor,
                "circle-stroke-width": 2,
                "circle-stroke-color": isDark ? "#334155" : "#ffffff",
                "circle-opacity": 0.85,
              }}
            />
            <Layer
              id="country-labels"
              type="symbol"
              layout={{
                "text-field": ["get", "count"],
                "text-size": 11,
                "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
                "text-allow-overlap": true,
              }}
              paint={{
                "text-color": isDark ? "#f1f5f9" : "#1e293b",
              }}
            />
          </Source>
        )}

        {/* Bubble markers for region/city drill-down */}
        {(viewLevel === "region" || viewLevel === "city") && (
          <Source
            id="bubble-data"
            type="geojson"
            data={bubbleGeoJSON}
          >
            <Layer
              id="bubble-circles"
              type="circle"
              paint={{
                "circle-radius": circleRadiusExpression,
                "circle-color": BUBBLE_COLOR,
                "circle-stroke-width": 2,
                "circle-stroke-color": BUBBLE_STROKE,
                "circle-opacity": 0.75,
              }}
            />
            <Layer
              id="bubble-labels"
              type="symbol"
              layout={{
                "text-field": ["get", "count"],
                "text-size": 12,
                "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
                "text-allow-overlap": true,
              }}
              paint={{
                "text-color": "#ffffff",
              }}
            />
          </Source>
        )}

        {/* Hover tooltip */}
        {hoverInfo && (
          <Popup
            longitude={hoverInfo.longitude}
            latitude={hoverInfo.latitude}
            closeButton={false}
            closeOnClick={false}
            anchor="bottom"
            offset={12}
            className="map-tooltip"
          >
            <div className="px-2 py-1 text-sm">
              <p className="font-semibold">{hoverInfo.name}</p>
              <p className="text-muted-foreground">
                {hoverInfo.count} {hoverInfo.count === 1 ? "alumnus" : "alumni"}
              </p>
            </div>
          </Popup>
        )}
      </Map>

      {/* Legend (country view only) */}
      {viewLevel === "country" && (
        <MapLegend buckets={buckets} colors={CHOROPLETH_COLORS} />
      )}
    </div>
  );
}
