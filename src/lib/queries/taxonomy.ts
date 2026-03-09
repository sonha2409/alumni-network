import { createClient } from '@/lib/supabase/server';
import type { Industry, Specialization, IndustryWithSpecializations } from '@/lib/types';

/**
 * Fetch all active industries, ordered by sort_order.
 */
export async function getIndustries(): Promise<Industry[]> {
  const supabase = await createClient();
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
}

/**
 * Fetch active specializations for a given industry.
 */
export async function getSpecializationsByIndustry(industryId: string): Promise<Specialization[]> {
  const supabase = await createClient();
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
}

/**
 * Fetch all active industries with their active specializations nested.
 * Used for profile forms and directory filter dropdowns.
 */
export async function getIndustriesWithSpecializations(): Promise<IndustryWithSpecializations[]> {
  const supabase = await createClient();
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
}
