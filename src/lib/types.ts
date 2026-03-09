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
// School Types
// =============================================================================

export interface School {
  id: string;
  name: string;
  name_en: string | null;
  abbreviation: string | null;
  slug: string;
  school_type: "high_school" | "university" | "college";
  program_duration_years: number;
  founded_year: number;
  first_graduating_year: number;
  country: string | null;
  state_province: string | null;
  city: string | null;
  website_url: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  school_id: string;
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
  specialization_name: string;
  school_id: string;
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

// =============================================================================
// Career Entry Types
// =============================================================================

export interface CareerEntry {
  id: string;
  profile_id: string;
  job_title: string;
  company: string;
  industry_id: string | null;
  specialization_id: string | null;
  start_date: string;
  end_date: string | null;
  description: string | null;
  is_current: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Career entry joined with industry/specialization names for display. */
export interface CareerEntryWithIndustry extends CareerEntry {
  industry: Industry | null;
  specialization: Specialization | null;
}

// =============================================================================
// Education Entry Types
// =============================================================================

export interface EducationEntry {
  id: string;
  profile_id: string;
  institution: string;
  degree: string | null;
  field_of_study: string | null;
  start_year: number | null;
  end_year: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Availability Tag Types
// =============================================================================

export interface AvailabilityTagType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_archived: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface UserAvailabilityTag {
  id: string;
  profile_id: string;
  tag_type_id: string;
  created_at: string;
}
