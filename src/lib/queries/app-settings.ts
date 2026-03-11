import { createClient } from "@/lib/supabase/server";

/**
 * Get an app setting value by key.
 * Returns the parsed JSONB value, or the default if not found.
 */
export async function getAppSetting<T>(
  key: string,
  defaultValue: T
): Promise<T> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    console.error("[Query:getAppSetting]", { key, error: error.message });
    return defaultValue;
  }

  if (!data) return defaultValue;

  return data.value as T;
}

/**
 * Get the profile staleness threshold in months.
 * Returns 0 if disabled.
 */
export async function getStalenessThresholdMonths(): Promise<number> {
  return getAppSetting<number>("profile_staleness_months", 6);
}
