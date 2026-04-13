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
  company_website: string | null;
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
  current_company_website: string | null;
  availability_tags: { id: string; name: string; slug: string }[];
}

/** A recommended profile with similarity score. */
export interface RecommendedProfile extends DirectoryProfile {
  score: number;
}

/** A popular/trending alumni profile. */
export interface PopularProfile extends DirectoryProfile {
  popularity_score: number;
  view_count: number;
  connection_count: number;
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

/** A file attached to a message. */
export interface MessageAttachment {
  id: string;
  message_id: string;
  uploader_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  content_type: string;
  attachment_type: "image" | "document";
  width: number | null;
  height: number | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Input metadata for creating an attachment (after file is uploaded to storage). */
export interface AttachmentInput {
  fileName: string;
  filePath: string;
  fileSize: number;
  contentType: string;
  attachmentType: "image" | "document";
  width?: number;
  height?: number;
}

/** Attachment with a signed URL and sender name — used in the media panel. */
export interface AttachmentWithSender extends MessageAttachment {
  signed_url: string | null;
  sender_name: string;
}

/** Message with sender profile info for chat display. */
export interface MessageWithSender extends Message {
  sender: {
    user_id: string;
    full_name: string;
    photo_url: string | null;
  };
  attachments?: MessageAttachment[];
}

export interface MessageReport {
  id: string;
  message_id: string;
  reporter_id: string;
  reason: string;
  status: "pending" | "reviewed" | "action_taken" | "dismissed" | "escalated";
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Report with joined message and user data for the moderation queue. */
export interface ModerationReportRow {
  id: string;
  reason: string;
  status: "pending" | "reviewed" | "action_taken" | "dismissed" | "escalated";
  created_at: string;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  message_id: string;
  message_content: string;
  message_is_deleted: boolean;
  message_created_at: string;
  conversation_id: string;
  reported_user_id: string;
  reported_user_name: string | null;
  reported_user_photo: string | null;
  reported_user_email: string;
  reported_user_muted_until: string | null;
  reporter_id: string;
  report_count: number;
  warning_count: number;
}

/** Conversation message for moderation context view. */
export interface ModerationContextMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  is_deleted: boolean;
  created_at: string;
  is_reported: boolean;
}

/** User warning record. */
export interface UserWarning {
  id: string;
  user_id: string;
  moderator_id: string;
  report_id: string | null;
  reason: string;
  created_at: string;
  moderator_name: string | null;
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
  | "announcement"
  | "user_warning"
  | "user_muted"
  | "account_deletion"
  | "account_reactivated"
  | "profile_staleness"
  | "event_invite"
  | "event_update"
  | "event_cancelled"
  | "event_rsvp_promoted"
  | "event_nearby"
  | "event_comment"
  | "event_cancelled_by_admin";

// =============================================================================
// Events (F47a)
// =============================================================================

export type EventLocationType = "physical" | "virtual" | "hybrid";
export type EventRsvpStatus = "going" | "maybe" | "cant_go";

export type EventRecurrenceRule = "weekly" | "monthly";

export interface EventRow {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  location_type: EventLocationType;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  virtual_url: string | null;
  start_time: string;
  end_time: string;
  event_timezone: string;
  is_public: boolean;
  capacity: number | null;
  cover_image_url: string | null;
  group_id: string | null;
  series_id: string | null;
  series_index: number | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventSeriesRow {
  id: string;
  creator_id: string;
  rrule: EventRecurrenceRule;
  interval_val: number;
  until_date: string;
  base_title: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventRsvp {
  id: string;
  event_id: string;
  user_id: string;
  status: EventRsvpStatus;
  plus_one_name: string | null;
  plus_one_email: string | null;
  needs_reconfirm: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventCoHost {
  event_id: string;
  user_id: string;
  created_at: string;
}

export interface EventInvite {
  id: string;
  event_id: string;
  invitee_id: string;
  invited_by: string | null;
  created_at: string;
}

export interface EventWaitlistEntry {
  id: string;
  event_id: string;
  user_id: string;
  plus_one_name: string | null;
  plus_one_email: string | null;
  created_at: string;
}

// =============================================================================
// Event Comments (F47c)
// =============================================================================

export interface EventComment {
  id: string;
  event_id: string;
  user_id: string;
  body: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Enriched comment for display with author profile info. */
export interface EventCommentWithAuthor extends EventComment {
  author_name: string | null;
  author_photo_url: string | null;
}

/** Enriched comment report for moderation queue display. */
export interface CommentReportRow {
  id: string;
  reason: string;
  status: "pending" | "reviewed" | "action_taken" | "dismissed" | "escalated";
  created_at: string;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  comment_id: string;
  comment_body: string;
  comment_is_deleted: boolean;
  comment_created_at: string;
  event_id: string;
  event_title: string;
  reported_user_id: string;
  reported_user_name: string | null;
  reported_user_photo: string | null;
  reported_user_email: string;
  reported_user_muted_until: string | null;
  reporter_id: string;
  report_count: number;
  warning_count: number;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  grouped_count: number;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  email_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Group Types
// =============================================================================

export type GroupType = "year_based" | "field_based" | "location_based" | "custom";

export type GroupMemberRole = "member" | "moderator" | "owner";

export interface Group {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: GroupType;
  cover_image_url: string | null;
  max_members: number | null;
  created_by: string;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupMemberRole;
  created_at: string;
  updated_at: string;
}

/** Group with member count and current user's membership status. */
export interface GroupWithMemberCount extends Group {
  member_count: number;
  is_member: boolean;
}

/** Group detail with creator profile info. */
export interface GroupWithDetails extends GroupWithMemberCount {
  created_by_name: string;
  created_by_photo_url: string | null;
}

/** Filters for the groups browse page. */
export interface GroupFilters {
  search?: string;
  type?: GroupType;
  page?: number;
  pageSize?: number;
}

/** Paginated groups result. */
export interface GroupsResult {
  groups: GroupWithMemberCount[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// =============================================================================
// Map Types
// =============================================================================

export interface MapFilters {
  industryId?: string;
  specializationId?: string;
  graduationYearMin?: number;
  graduationYearMax?: number;
}

export interface CountryMapData {
  country: string;
  alumniCount: number;
  latitude: number;
  longitude: number;
}

export interface RegionMapData {
  stateProvince: string;
  alumniCount: number;
  avgLatitude: number;
  avgLongitude: number;
}

export interface CityMapData {
  city: string;
  alumniCount: number;
  avgLatitude: number;
  avgLongitude: number;
}

export interface AdminCountryMapData extends CountryMapData {
  verifiedCount: number;
  unverifiedCount: number;
}

export interface TrendDataPoint {
  country: string;
  month: string;
  newUsers: number;
}

// =============================================================================
// Admin User Management Types
// =============================================================================

export type AdminAction =
  | "verify"
  | "ban"
  | "unban"
  | "suspend"
  | "unsuspend"
  | "promote"
  | "demote"
  | "delete"
  | "taxonomy_create_industry"
  | "taxonomy_update_industry"
  | "taxonomy_archive_industry"
  | "taxonomy_restore_industry"
  | "taxonomy_create_specialization"
  | "taxonomy_update_specialization"
  | "taxonomy_archive_specialization"
  | "taxonomy_restore_specialization"
  | "bulk_invite"
  | "resend_invite"
  | "create_announcement"
  | "update_announcement"
  | "toggle_announcement"
  | "delete_announcement"
  | "warn"
  | "mute"
  | "unmute"
  | "dismiss_report"
  | "escalate_report"
  | "account_self_delete"
  | "account_reactivate"
  | "update_app_setting"
  | "cancel_event";

// =============================================================================
// Admin Taxonomy Management Types
// =============================================================================

export interface AdminIndustryRow extends Industry {
  user_count: number;
  specializations: AdminSpecializationRow[];
}

export interface AdminSpecializationRow extends Specialization {
  user_count: number;
}

export interface AdminTaxonomyData {
  industries: AdminIndustryRow[];
  totalIndustries: number;
  totalSpecializations: number;
  totalArchivedIndustries: number;
  totalArchivedSpecializations: number;
}

export interface AdminAuditLogEntry {
  id: string;
  admin_id: string;
  target_user_id: string;
  action: AdminAction;
  details: Record<string, unknown>;
  created_at: string;
  admin_name: string | null;
}

export interface AdminUserRow {
  id: string;
  email: string;
  role: "user" | "moderator" | "admin";
  verification_status: "unverified" | "pending" | "verified" | "rejected";
  is_active: boolean;
  suspended_until: string | null;
  ban_reason: string | null;
  created_at: string;
  full_name: string | null;
  photo_url: string | null;
  graduation_year: number | null;
  primary_industry_name: string | null;
  last_active_at: string | null;
}

export interface AdminUserFilters {
  search?: string;
  role?: "user" | "moderator" | "admin";
  verificationStatus?: "unverified" | "pending" | "verified" | "rejected";
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface AdminUsersResult {
  users: AdminUserRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// =============================================================================
// Admin Event Management Types
// =============================================================================

export type AdminEventStatus = "active" | "cancelled" | "past";

export interface AdminEventRow {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location_type: EventLocationType;
  address: string | null;
  is_public: boolean;
  capacity: number | null;
  deleted_at: string | null;
  created_at: string;
  series_id: string | null;
  group_id: string | null;
  creator_id: string;
  creator_name: string | null;
  creator_email: string;
  going_count: number;
  /** If cancelled by admin, the moderation action info */
  moderation_action: {
    admin_name: string | null;
    reason: string;
    created_at: string;
  } | null;
}

export interface AdminEventFilters {
  search?: string;
  status?: AdminEventStatus;
  isPublic?: boolean;
  page?: number;
  pageSize?: number;
}

export interface AdminEventsResult {
  events: AdminEventRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminEventDetail extends AdminEventRow {
  description: string | null;
  virtual_url: string | null;
  event_timezone: string;
  maybe_count: number;
  waitlist_count: number;
  cohost_count: number;
  comments_count: number;
  moderation_history: EventModerationActionRow[];
}

export interface EventModerationActionRow {
  id: string;
  event_id: string;
  admin_id: string;
  action: string;
  reason: string;
  details: Record<string, unknown>;
  created_at: string;
  admin_name: string | null;
}

// =============================================================================
// Bulk Invite Types
// =============================================================================

export interface BulkInviteRow {
  id: string;
  email: string;
  name: string | null;
  graduation_year: number | null;
  invited_by: string;
  status: "invited" | "signed_up" | "verified";
  invited_at: string;
  signed_up_at: string | null;
  created_at: string;
}

export interface BulkInviteResult {
  sent: number;
  skipped: number;
  errors: string[];
}

// =============================================================================
// Announcement Types
// =============================================================================

export interface Announcement {
  id: string;
  title: string;
  body: string;
  link: string | null;
  created_by: string;
  is_active: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
}

/** Announcement with the admin author's name for display in admin table. */
export interface AnnouncementWithAuthor extends Announcement {
  author_name: string | null;
}

export interface BulkInviteHistoryResult {
  invites: BulkInviteRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
