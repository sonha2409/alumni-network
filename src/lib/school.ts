import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import type { School } from "@/lib/types";

/**
 * Fetch the active school record — cached for 1 hour.
 * Uses service client to bypass cookies dependency so unstable_cache works.
 */
export const getSchool: () => Promise<School> = unstable_cache(
  async () => {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("schools")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (error || !data) {
      throw new Error("Failed to load school data");
    }

    return data as School;
  },
  ["school-data"],
  { revalidate: 3600 }
);
