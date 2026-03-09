/**
 * Calculate profile completeness as a percentage (0–100).
 * Weighted scoring based on field importance.
 */
export function calculateProfileCompleteness(fields: {
  full_name: string | null;
  graduation_year: number | null;
  primary_industry_id: string | null;
  photo_url: string | null;
  bio: string | null;
  primary_specialization_id: string | null;
  country: string | null;
  state_province: string | null;
  city: string | null;
  secondary_industry_id: string | null;
  secondary_specialization_id: string | null;
  has_career_entries?: boolean;
  has_education_entries?: boolean;
  has_availability_tags?: boolean;
}): number {
  let score = 0;

  if (fields.full_name) score += 12;
  if (fields.graduation_year) score += 12;
  if (fields.primary_industry_id) score += 12;
  if (fields.photo_url) score += 12;
  if (fields.bio) score += 8;
  if (fields.primary_specialization_id) score += 8;
  if (fields.country || fields.state_province || fields.city) score += 8;
  if (fields.secondary_industry_id) score += 4;
  if (fields.secondary_specialization_id) score += 4;
  if (fields.has_career_entries) score += 10;
  if (fields.has_education_entries) score += 6;
  if (fields.has_availability_tags) score += 4;

  return score;
}
