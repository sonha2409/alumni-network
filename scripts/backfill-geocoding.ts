/**
 * Backfill geocoding for existing profiles that have location data
 * but no latitude/longitude coordinates.
 *
 * Usage: npx tsx scripts/backfill-geocoding.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * environment variables (loaded from .env.local).
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load .env.local
config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const BATCH_SIZE = 50;
const DELAY_MS = 1100; // Nominatim: max 1 request/second

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocode(
  city: string | null,
  stateProvince: string | null,
  country: string | null
): Promise<{ latitude: number; longitude: number } | null> {
  if (!country && !city) return null;

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
      const params = new URLSearchParams({ q, format: "json", limit: "1" });
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        { headers: { "User-Agent": "AlumNet/1.0 (backfill-script)" } }
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
      continue;
    }
  }

  return null;
}

async function main() {
  console.log("Starting geocoding backfill...\n");

  // Count total profiles needing geocoding
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .is("latitude", null)
    .or("city.not.is.null,country.not.is.null");

  console.log(`Found ${count ?? 0} profiles needing geocoding.\n`);

  if (!count || count === 0) {
    console.log("Nothing to do.");
    return;
  }

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let offset = 0;

  while (offset < count) {
    const { data: batch, error } = await supabase
      .from("profiles")
      .select("id, country, state_province, city")
      .is("latitude", null)
      .or("city.not.is.null,country.not.is.null")
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error("Error fetching batch:", error.message);
      break;
    }

    if (!batch || batch.length === 0) break;

    for (const profile of batch) {
      processed++;
      const coords = await geocode(
        profile.city,
        profile.state_province,
        profile.country
      );

      if (coords) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            latitude: coords.latitude,
            longitude: coords.longitude,
            location_geocoded_at: new Date().toISOString(),
          })
          .eq("id", profile.id);

        if (updateError) {
          console.error(
            `  [FAIL] ${profile.id}: Update error — ${updateError.message}`
          );
          failed++;
        } else {
          succeeded++;
          console.log(
            `  [OK] ${profile.id}: ${profile.city ?? ""}, ${profile.state_province ?? ""}, ${profile.country ?? ""} → (${coords.latitude}, ${coords.longitude})`
          );
        }
      } else {
        failed++;
        console.log(
          `  [SKIP] ${profile.id}: Could not geocode "${profile.city ?? ""}, ${profile.state_province ?? ""}, ${profile.country ?? ""}"`
        );
      }

      // Rate limit: wait between requests
      await sleep(DELAY_MS);

      if (processed % 10 === 0) {
        console.log(`\n  Progress: ${processed}/${count} (${succeeded} OK, ${failed} failed)\n`);
      }
    }

    offset += BATCH_SIZE;
  }

  console.log(`\nDone! Processed ${processed} profiles.`);
  console.log(`  Succeeded: ${succeeded}`);
  console.log(`  Failed/Skipped: ${failed}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
