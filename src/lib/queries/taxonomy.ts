import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import type { Industry, Specialization, IndustryWithSpecializations } from '@/lib/types';

/**
 * Fetch all active industries, ordered by sort_order — cached for 1 hour.
 */
export const getIndustries: () => Promise<Industry[]> = unstable_cache(
  async () => {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('industries')
      .select('*')
      .eq('is_archived', false)
      .order('sort_order');

    if (error) {
      console.error('[Query:getIndustries]', { error: error.message });
      return [];
    }

    return data as Industry[];
  },
  ["industries"],
  { revalidate: 3600 }
);

/**
 * Fetch active specializations for a given industry — cached for 1 hour.
 */
export const getSpecializationsByIndustry = (industryId: string): Promise<Specialization[]> =>
  unstable_cache(
    async () => {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from('specializations')
        .select('*')
        .eq('industry_id', industryId)
        .eq('is_archived', false)
        .order('sort_order');

      if (error) {
        console.error('[Query:getSpecializationsByIndustry]', { industryId, error: error.message });
        return [];
      }

      return data as Specialization[];
    },
    ["specializations", industryId],
    { revalidate: 3600 }
  )();

/**
 * Fetch all active industries with their active specializations nested — cached for 1 hour.
 * Used for profile forms and directory filter dropdowns.
 */
export const getIndustriesWithSpecializations: () => Promise<IndustryWithSpecializations[]> = unstable_cache(
  async () => {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('industries')
      .select(`
        *,
        specializations (*)
      `)
      .eq('is_archived', false)
      .eq('specializations.is_archived', false)
      .order('sort_order')
      .order('sort_order', { referencedTable: 'specializations' });

    if (error) {
      console.error('[Query:getIndustriesWithSpecializations]', { error: error.message });
      return [];
    }

    return data as IndustryWithSpecializations[];
  },
  ["industries-with-specializations"],
  { revalidate: 3600 }
);
