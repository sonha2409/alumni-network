/**
 * Discriminated union for Server Action return values.
 * All Server Actions should return this type.
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

// =============================================================================
// Taxonomy Types
// =============================================================================

export interface Industry {
  id: string;
  name: string;
  slug: string;
  is_archived: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Specialization {
  id: string;
  industry_id: string;
  name: string;
  slug: string;
  is_archived: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Industry with its nested specializations — used in profile forms and filters. */
export interface IndustryWithSpecializations extends Industry {
  specializations: Specialization[];
}
