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
  has_contact_details: boolean;
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

export interface VerificationDocument {
  id: string;
  request_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  content_type: string;
  created_at: string;
}

/** Verification request joined with user profile data for admin queue display. */
export interface VerificationRequestWithUser extends VerificationRequest {
  user_full_name: string;
  user_email: string;
  user_photo_url: string | null;
  document_count: number;
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

// =============================================================================
// Connection Types
// =============================================================================

export type ConnectionStatus = "pending" | "accepted" | "rejected";

export interface Connection {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: ConnectionStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
}

/** Connection joined with the other person's profile data for display. */
export interface ConnectionWithProfile extends Connection {
  profile: DirectoryProfile;
}

export interface Block {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

/**
 * Relationship status between the current user and another user.
 * Used to determine which UI actions to show.
 */
export type RelationshipStatus =
  | "none"
  | "pending_sent"
  | "pending_received"
  | "connected"
  | "blocked_by_me"
  | "blocked_by_them";

export interface RelationshipInfo {
  status: RelationshipStatus;
  connectionId: string | null;
  blockId: string | null;
}

// =============================================================================
// Profile Visibility Types
// =============================================================================

export type ProfileVisibilityTier = "tier1_unverified" | "tier2_verified" | "tier3_connected";

export interface ProfileContactDetails {
  id: string;
  profile_id: string;
  personal_email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  website_url: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Directory Types
// =============================================================================

/** Filters for the alumni directory search. */
export interface DirectoryFilters {
  query?: string;
  industryId?: string;
  specializationId?: string;
  graduationYearMin?: number;
  graduationYearMax?: number;
  country?: string;
  stateProvince?: string;
  city?: string;
  availabilityTagIds?: string[];
  sortBy?: "relevance" | "graduation_year" | "name" | "recently_active";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

/** A single profile card in directory results. */
export interface DirectoryProfile {
  id: string;
  user_id: string;
  full_name: string;
  photo_url: string | null;
  graduation_year: number;
  country: string | null;
  state_province: string | null;
  city: string | null;
  bio: string | null;
  last_active_at: string;
  primary_industry: { id: string; name: string } | null;
  primary_specialization: { id: string; name: string } | null;
  has_contact_details: boolean;
  current_job_title: string | null;
  current_company: string | null;
  availability_tags: { id: string; name: string; slug: string }[];
}

/** A recommended profile with similarity score. */
export interface RecommendedProfile extends DirectoryProfile {
  score: number;
}

/** Paginated directory search result. */
export interface DirectoryResult {
  profiles: DirectoryProfile[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// =============================================================================
// Messaging Types
// =============================================================================

export interface Conversation {
  id: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  last_read_at: string;
  is_muted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_edited: boolean;
  edited_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Conversation list item with other participant's profile and unread count. */
export interface ConversationWithDetails {
  id: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  is_active: boolean;
  created_at: string;
  other_participant: {
    user_id: string;
    full_name: string;
    photo_url: string | null;
    profile_id: string;
  };
  unread_count: number;
  is_muted: boolean;
}

/** Message with sender profile info for chat display. */
export interface MessageWithSender extends Message {
  sender: {
    user_id: string;
    full_name: string;
    photo_url: string | null;
  };
}

export interface MessageReport {
  id: string;
  message_id: string;
  reporter_id: string;
  reason: string;
  status: "pending" | "reviewed" | "action_taken" | "dismissed";
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Rate limit info returned with messaging actions. */
export interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetsAt: string;
}

// =============================================================================
// Notification Types
// =============================================================================

export type NotificationType =
  | "connection_request"
  | "connection_accepted"
  | "new_message"
  | "verification_update"
  | "announcement";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}
