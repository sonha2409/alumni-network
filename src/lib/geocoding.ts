/**
 * Geocoding utilities for the alumni map feature.
 * - Static country centroid lookup (no API needed)
 * - Nominatim geocoder for city/state-level coordinates
 */

interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Static country name → centroid coordinates lookup.
 * Keys are lowercase for case-insensitive matching.
 * Covers ~200 countries with common name variants.
 */
export const COUNTRY_CENTROIDS: Record<string, Coordinates> = {
  "afghanistan": { latitude: 33.93, longitude: 67.71 },
  "albania": { latitude: 41.15, longitude: 20.17 },
  "algeria": { latitude: 28.03, longitude: 1.66 },
  "andorra": { latitude: 42.55, longitude: 1.60 },
  "angola": { latitude: -11.20, longitude: 17.87 },
  "antigua and barbuda": { latitude: 17.06, longitude: -61.80 },
  "argentina": { latitude: -38.42, longitude: -63.62 },
  "armenia": { latitude: 40.07, longitude: 45.04 },
  "australia": { latitude: -25.27, longitude: 133.78 },
  "austria": { latitude: 47.52, longitude: 14.55 },
  "azerbaijan": { latitude: 40.14, longitude: 47.58 },
  "bahamas": { latitude: 25.03, longitude: -77.40 },
  "the bahamas": { latitude: 25.03, longitude: -77.40 },
  "bahrain": { latitude: 26.07, longitude: 50.56 },
  "bangladesh": { latitude: 23.68, longitude: 90.36 },
  "barbados": { latitude: 13.19, longitude: -59.54 },
  "belarus": { latitude: 53.71, longitude: 27.95 },
  "belgium": { latitude: 50.50, longitude: 4.47 },
  "belize": { latitude: 17.19, longitude: -88.50 },
  "benin": { latitude: 9.31, longitude: 2.32 },
  "bhutan": { latitude: 27.51, longitude: 90.43 },
  "bolivia": { latitude: -16.29, longitude: -63.59 },
  "bosnia and herzegovina": { latitude: 43.92, longitude: 17.68 },
  "botswana": { latitude: -22.33, longitude: 24.68 },
  "brazil": { latitude: -14.24, longitude: -51.93 },
  "brunei": { latitude: 4.54, longitude: 114.73 },
  "bulgaria": { latitude: 42.73, longitude: 25.49 },
  "burkina faso": { latitude: 12.24, longitude: -1.56 },
  "burundi": { latitude: -3.37, longitude: 29.92 },
  "cabo verde": { latitude: 16.00, longitude: -24.01 },
  "cape verde": { latitude: 16.00, longitude: -24.01 },
  "cambodia": { latitude: 12.57, longitude: 104.99 },
  "cameroon": { latitude: 7.37, longitude: 12.35 },
  "canada": { latitude: 56.13, longitude: -106.35 },
  "central african republic": { latitude: 6.61, longitude: 20.94 },
  "chad": { latitude: 15.45, longitude: 18.73 },
  "chile": { latitude: -35.68, longitude: -71.54 },
  "china": { latitude: 35.86, longitude: 104.20 },
  "colombia": { latitude: 4.57, longitude: -74.30 },
  "comoros": { latitude: -11.88, longitude: 43.87 },
  "congo": { latitude: -0.23, longitude: 15.83 },
  "republic of the congo": { latitude: -0.23, longitude: 15.83 },
  "democratic republic of the congo": { latitude: -4.04, longitude: 21.76 },
  "dr congo": { latitude: -4.04, longitude: 21.76 },
  "drc": { latitude: -4.04, longitude: 21.76 },
  "costa rica": { latitude: 9.75, longitude: -83.75 },
  "croatia": { latitude: 45.10, longitude: 15.20 },
  "cuba": { latitude: 21.52, longitude: -77.78 },
  "cyprus": { latitude: 35.13, longitude: 33.43 },
  "czech republic": { latitude: 49.82, longitude: 15.47 },
  "czechia": { latitude: 49.82, longitude: 15.47 },
  "denmark": { latitude: 56.26, longitude: 9.50 },
  "djibouti": { latitude: 11.83, longitude: 42.59 },
  "dominica": { latitude: 15.41, longitude: -61.37 },
  "dominican republic": { latitude: 18.74, longitude: -70.16 },
  "ecuador": { latitude: -1.83, longitude: -78.18 },
  "egypt": { latitude: 26.82, longitude: 30.80 },
  "el salvador": { latitude: 13.79, longitude: -88.90 },
  "equatorial guinea": { latitude: 1.65, longitude: 10.27 },
  "eritrea": { latitude: 15.18, longitude: 39.78 },
  "estonia": { latitude: 58.60, longitude: 25.01 },
  "eswatini": { latitude: -26.52, longitude: 31.47 },
  "swaziland": { latitude: -26.52, longitude: 31.47 },
  "ethiopia": { latitude: 9.15, longitude: 40.49 },
  "fiji": { latitude: -17.71, longitude: 178.07 },
  "finland": { latitude: 61.92, longitude: 25.75 },
  "france": { latitude: 46.23, longitude: 2.21 },
  "gabon": { latitude: -0.80, longitude: 11.61 },
  "gambia": { latitude: 13.44, longitude: -15.31 },
  "the gambia": { latitude: 13.44, longitude: -15.31 },
  "georgia": { latitude: 42.32, longitude: 43.36 },
  "germany": { latitude: 51.17, longitude: 10.45 },
  "ghana": { latitude: 7.95, longitude: -1.02 },
  "greece": { latitude: 39.07, longitude: 21.82 },
  "grenada": { latitude: 12.12, longitude: -61.68 },
  "guatemala": { latitude: 15.78, longitude: -90.23 },
  "guinea": { latitude: 9.95, longitude: -9.70 },
  "guinea-bissau": { latitude: 11.80, longitude: -15.18 },
  "guyana": { latitude: 4.86, longitude: -58.93 },
  "haiti": { latitude: 18.97, longitude: -72.29 },
  "honduras": { latitude: 15.20, longitude: -86.24 },
  "hungary": { latitude: 47.16, longitude: 19.50 },
  "iceland": { latitude: 64.96, longitude: -19.02 },
  "india": { latitude: 20.59, longitude: 78.96 },
  "indonesia": { latitude: -0.79, longitude: 113.92 },
  "iran": { latitude: 32.43, longitude: 53.69 },
  "iraq": { latitude: 33.22, longitude: 43.68 },
  "ireland": { latitude: 53.14, longitude: -7.69 },
  "israel": { latitude: 31.05, longitude: 34.85 },
  "italy": { latitude: 41.87, longitude: 12.57 },
  "ivory coast": { latitude: 7.54, longitude: -5.55 },
  "cote d'ivoire": { latitude: 7.54, longitude: -5.55 },
  "jamaica": { latitude: 18.11, longitude: -77.30 },
  "japan": { latitude: 36.20, longitude: 138.25 },
  "jordan": { latitude: 30.59, longitude: 36.24 },
  "kazakhstan": { latitude: 48.02, longitude: 66.92 },
  "kenya": { latitude: -0.02, longitude: 37.91 },
  "kiribati": { latitude: -3.37, longitude: -168.73 },
  "north korea": { latitude: 40.34, longitude: 127.51 },
  "south korea": { latitude: 35.91, longitude: 127.77 },
  "korea": { latitude: 35.91, longitude: 127.77 },
  "kosovo": { latitude: 42.60, longitude: 20.90 },
  "kuwait": { latitude: 29.31, longitude: 47.48 },
  "kyrgyzstan": { latitude: 41.20, longitude: 74.77 },
  "laos": { latitude: 19.86, longitude: 102.50 },
  "latvia": { latitude: 56.88, longitude: 24.60 },
  "lebanon": { latitude: 33.85, longitude: 35.86 },
  "lesotho": { latitude: -29.61, longitude: 28.23 },
  "liberia": { latitude: 6.43, longitude: -9.43 },
  "libya": { latitude: 26.34, longitude: 17.23 },
  "liechtenstein": { latitude: 47.17, longitude: 9.56 },
  "lithuania": { latitude: 55.17, longitude: 23.88 },
  "luxembourg": { latitude: 49.82, longitude: 6.13 },
  "madagascar": { latitude: -18.77, longitude: 46.87 },
  "malawi": { latitude: -13.25, longitude: 34.30 },
  "malaysia": { latitude: 4.21, longitude: 101.98 },
  "maldives": { latitude: 3.20, longitude: 73.22 },
  "mali": { latitude: 17.57, longitude: -4.00 },
  "malta": { latitude: 35.94, longitude: 14.38 },
  "marshall islands": { latitude: 7.13, longitude: 171.18 },
  "mauritania": { latitude: 21.01, longitude: -10.94 },
  "mauritius": { latitude: -20.35, longitude: 57.55 },
  "mexico": { latitude: 23.63, longitude: -102.55 },
  "micronesia": { latitude: 7.43, longitude: 150.55 },
  "moldova": { latitude: 47.41, longitude: 28.37 },
  "monaco": { latitude: 43.75, longitude: 7.41 },
  "mongolia": { latitude: 46.86, longitude: 103.85 },
  "montenegro": { latitude: 42.71, longitude: 19.37 },
  "morocco": { latitude: 31.79, longitude: -7.09 },
  "mozambique": { latitude: -18.67, longitude: 35.53 },
  "myanmar": { latitude: 21.91, longitude: 95.96 },
  "burma": { latitude: 21.91, longitude: 95.96 },
  "namibia": { latitude: -22.96, longitude: 18.49 },
  "nauru": { latitude: -0.52, longitude: 166.93 },
  "nepal": { latitude: 28.39, longitude: 84.12 },
  "netherlands": { latitude: 52.13, longitude: 5.29 },
  "the netherlands": { latitude: 52.13, longitude: 5.29 },
  "holland": { latitude: 52.13, longitude: 5.29 },
  "new zealand": { latitude: -40.90, longitude: 174.89 },
  "nicaragua": { latitude: 12.87, longitude: -85.21 },
  "niger": { latitude: 17.61, longitude: 8.08 },
  "nigeria": { latitude: 9.08, longitude: 8.68 },
  "north macedonia": { latitude: 41.51, longitude: 21.75 },
  "macedonia": { latitude: 41.51, longitude: 21.75 },
  "norway": { latitude: 60.47, longitude: 8.47 },
  "oman": { latitude: 21.47, longitude: 55.98 },
  "pakistan": { latitude: 30.38, longitude: 69.35 },
  "palau": { latitude: 7.51, longitude: 134.58 },
  "palestine": { latitude: 31.95, longitude: 35.23 },
  "panama": { latitude: 8.54, longitude: -80.78 },
  "papua new guinea": { latitude: -6.31, longitude: 143.96 },
  "paraguay": { latitude: -23.44, longitude: -58.44 },
  "peru": { latitude: -9.19, longitude: -75.02 },
  "philippines": { latitude: 12.88, longitude: 121.77 },
  "the philippines": { latitude: 12.88, longitude: 121.77 },
  "poland": { latitude: 51.92, longitude: 19.15 },
  "portugal": { latitude: 39.40, longitude: -8.22 },
  "qatar": { latitude: 25.35, longitude: 51.18 },
  "romania": { latitude: 45.94, longitude: 24.97 },
  "russia": { latitude: 61.52, longitude: 105.32 },
  "russian federation": { latitude: 61.52, longitude: 105.32 },
  "rwanda": { latitude: -1.94, longitude: 29.87 },
  "saint kitts and nevis": { latitude: 17.36, longitude: -62.78 },
  "saint lucia": { latitude: 13.91, longitude: -60.98 },
  "saint vincent and the grenadines": { latitude: 12.98, longitude: -61.29 },
  "samoa": { latitude: -13.76, longitude: -172.10 },
  "san marino": { latitude: 43.94, longitude: 12.46 },
  "sao tome and principe": { latitude: 0.19, longitude: 6.61 },
  "saudi arabia": { latitude: 23.89, longitude: 45.08 },
  "senegal": { latitude: 14.50, longitude: -14.45 },
  "serbia": { latitude: 44.02, longitude: 21.01 },
  "seychelles": { latitude: -4.68, longitude: 55.49 },
  "sierra leone": { latitude: 8.46, longitude: -11.78 },
  "singapore": { latitude: 1.35, longitude: 103.82 },
  "slovakia": { latitude: 48.67, longitude: 19.70 },
  "slovenia": { latitude: 46.15, longitude: 14.99 },
  "solomon islands": { latitude: -9.65, longitude: 160.16 },
  "somalia": { latitude: 5.15, longitude: 46.20 },
  "south africa": { latitude: -30.56, longitude: 22.94 },
  "south sudan": { latitude: 6.88, longitude: 31.31 },
  "spain": { latitude: 40.46, longitude: -3.75 },
  "sri lanka": { latitude: 7.87, longitude: 80.77 },
  "sudan": { latitude: 12.86, longitude: 30.22 },
  "suriname": { latitude: 3.92, longitude: -56.03 },
  "sweden": { latitude: 60.13, longitude: 18.64 },
  "switzerland": { latitude: 46.82, longitude: 8.23 },
  "syria": { latitude: 34.80, longitude: 39.00 },
  "taiwan": { latitude: 23.70, longitude: 120.96 },
  "tajikistan": { latitude: 38.86, longitude: 71.28 },
  "tanzania": { latitude: -6.37, longitude: 34.89 },
  "thailand": { latitude: 15.87, longitude: 100.99 },
  "timor-leste": { latitude: -8.87, longitude: 125.73 },
  "east timor": { latitude: -8.87, longitude: 125.73 },
  "togo": { latitude: 8.62, longitude: 1.21 },
  "tonga": { latitude: -21.18, longitude: -175.20 },
  "trinidad and tobago": { latitude: 10.69, longitude: -61.22 },
  "tunisia": { latitude: 33.89, longitude: 9.54 },
  "turkey": { latitude: 38.96, longitude: 35.24 },
  "turkiye": { latitude: 38.96, longitude: 35.24 },
  "turkmenistan": { latitude: 38.97, longitude: 59.56 },
  "tuvalu": { latitude: -7.11, longitude: 177.65 },
  "uganda": { latitude: 1.37, longitude: 32.29 },
  "ukraine": { latitude: 48.38, longitude: 31.17 },
  "united arab emirates": { latitude: 23.42, longitude: 53.85 },
  "uae": { latitude: 23.42, longitude: 53.85 },
  "united kingdom": { latitude: 55.38, longitude: -3.44 },
  "uk": { latitude: 55.38, longitude: -3.44 },
  "great britain": { latitude: 55.38, longitude: -3.44 },
  "england": { latitude: 52.36, longitude: -1.17 },
  "scotland": { latitude: 56.49, longitude: -4.20 },
  "wales": { latitude: 52.13, longitude: -3.78 },
  "united states": { latitude: 37.09, longitude: -95.71 },
  "united states of america": { latitude: 37.09, longitude: -95.71 },
  "usa": { latitude: 37.09, longitude: -95.71 },
  "us": { latitude: 37.09, longitude: -95.71 },
  "america": { latitude: 37.09, longitude: -95.71 },
  "uruguay": { latitude: -32.52, longitude: -55.77 },
  "uzbekistan": { latitude: 41.38, longitude: 64.59 },
  "vanuatu": { latitude: -15.38, longitude: 166.96 },
  "vatican city": { latitude: 41.90, longitude: 12.45 },
  "venezuela": { latitude: 6.42, longitude: -66.59 },
  "vietnam": { latitude: 14.06, longitude: 108.28 },
  "viet nam": { latitude: 14.06, longitude: 108.28 },
  "yemen": { latitude: 15.55, longitude: 48.52 },
  "zambia": { latitude: -13.13, longitude: 27.85 },
  "zimbabwe": { latitude: -19.02, longitude: 29.15 },
  // Territories & dependencies
  "hong kong": { latitude: 22.40, longitude: 114.11 },
  "macau": { latitude: 22.20, longitude: 113.54 },
  "macao": { latitude: 22.20, longitude: 113.54 },
  "puerto rico": { latitude: 18.22, longitude: -66.59 },
  "guam": { latitude: 13.44, longitude: 144.79 },
};

/**
 * Look up country centroid coordinates from a free-text country name.
 * Returns null if the country is not recognized.
 */
export function getCountryCentroid(country: string): Coordinates | null {
  const key = country.trim().toLowerCase();
  return COUNTRY_CENTROIDS[key] ?? null;
}

/**
 * Geocode a location (city/state/country) to coordinates using Nominatim.
 * Uses progressive fallback: full address → city+country → country only.
 * Respects Nominatim usage policy (User-Agent header required).
 *
 * Returns null on failure — never throws.
 */
export async function geocodeLocation(
  city: string | null,
  stateProvince: string | null,
  country: string | null
): Promise<Coordinates | null> {
  if (!country && !city) return null;

  // Build query variants for progressive fallback
  const queries: string[] = [];

  if (city && stateProvince && country) {
    queries.push(`${city}, ${stateProvince}, ${country}`);
  }
  if (city && country) {
    queries.push(`${city}, ${country}`);
  }
  if (country) {
    queries.push(country);
  }

  for (const q of queries) {
    try {
      const params = new URLSearchParams({
        q,
        format: "json",
        limit: "1",
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        {
          headers: {
            "User-Agent": "AlumNet/1.0 (alumni-network-platform)",
          },
        }
      );

      if (!response.ok) continue;

      const results = (await response.json()) as Array<{
        lat: string;
        lon: string;
      }>;

      if (results.length > 0) {
        const lat = parseFloat(results[0].lat);
        const lng = parseFloat(results[0].lon);

        if (!isNaN(lat) && !isNaN(lng)) {
          return { latitude: lat, longitude: lng };
        }
      }
    } catch {
      // Network error or JSON parse error — try next query variant
      continue;
    }
  }

  return null;
}

/**
 * Check if location fields have changed between old and new values.
 */
export function hasLocationChanged(
  oldValues: { country: string | null; state_province: string | null; city: string | null },
  newValues: { country: string | null; state_province: string | null; city: string | null }
): boolean {
  return (
    oldValues.country !== newValues.country ||
    oldValues.state_province !== newValues.state_province ||
    oldValues.city !== newValues.city
  );
}
