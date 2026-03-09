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
}): number {
  let score = 0;

  if (fields.full_name) score += 15;
  if (fields.graduation_year) score += 15;
  if (fields.primary_industry_id) score += 15;
  if (fields.photo_url) score += 15;
  if (fields.bio) score += 10;
  if (fields.primary_specialization_id) score += 10;
  if (fields.country || fields.state_province || fields.city) score += 10;
  if (fields.secondary_industry_id) score += 5;
  if (fields.secondary_specialization_id) score += 5;

  return score;
}
