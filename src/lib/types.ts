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

// =============================================================================
// Profile Types
// =============================================================================

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  photo_url: string | null;
  bio: string | null;
  graduation_year: number;
  primary_industry_id: string;
  primary_specialization_id: string | null;
  secondary_industry_id: string | null;
  secondary_specialization_id: string | null;
  country: string | null;
  state_province: string | null;
  city: string | null;
  profile_completeness: number;
  last_active_at: string;
  last_profile_update_at: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Verification Types
// =============================================================================

export interface VerificationRequest {
  id: string;
  user_id: string;
  graduation_year: number;
  student_id: string | null;
  degree_program: string;
  supporting_info: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  review_message: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Verification request joined with user profile data for admin queue display. */
export interface VerificationRequestWithUser extends VerificationRequest {
  user_full_name: string;
  user_email: string;
  user_photo_url: string | null;
}

/** Profile joined with industry/specialization names for display. */
export interface ProfileWithIndustry extends Profile {
  primary_industry: Industry;
  primary_specialization: Specialization | null;
  secondary_industry: Industry | null;
  secondary_specialization: Specialization | null;
}
