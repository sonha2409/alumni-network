import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// Test the validation schema in isolation
const stalenessSchema = z.object({
  staleness_months: z.coerce.number().int().min(0).max(60),
});

describe("updateStalenessThreshold validation", () => {
  it("should_accept_valid_threshold_value", () => {
    const result = stalenessSchema.safeParse({ staleness_months: "6" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.staleness_months).toBe(6);
    }
  });

  it("should_accept_zero_to_disable", () => {
    const result = stalenessSchema.safeParse({ staleness_months: "0" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.staleness_months).toBe(0);
    }
  });

  it("should_reject_negative_values", () => {
    const result = stalenessSchema.safeParse({ staleness_months: "-1" });
    expect(result.success).toBe(false);
  });

  it("should_reject_values_over_60", () => {
    const result = stalenessSchema.safeParse({ staleness_months: "61" });
    expect(result.success).toBe(false);
  });

  it("should_reject_non_integer_values", () => {
    const result = stalenessSchema.safeParse({ staleness_months: "6.5" });
    expect(result.success).toBe(false);
  });

  it("should_coerce_string_to_number", () => {
    const result = stalenessSchema.safeParse({ staleness_months: "12" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data.staleness_months).toBe("number");
      expect(result.data.staleness_months).toBe(12);
    }
  });

  it("should_reject_non_numeric_strings", () => {
    const result = stalenessSchema.safeParse({ staleness_months: "abc" });
    expect(result.success).toBe(false);
  });
});

// Test the quick-update validation schema
const quickUpdateSchema = z.object({
  profile_id: z.string().uuid(),
  career_entry_id: z.string().uuid().optional(),
  job_title: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  country: z.string().max(100).optional(),
  state_province: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  tag_type_ids: z.array(z.string().uuid()).optional(),
  no_changes: z.string().optional(),
});

describe("quickUpdateProfile validation", () => {
  const validProfileId = "550e8400-e29b-41d4-a716-446655440000";

  it("should_accept_valid_quick_update_data", () => {
    const result = quickUpdateSchema.safeParse({
      profile_id: validProfileId,
      job_title: "Software Engineer",
      company: "Google",
      country: "Vietnam",
    });
    expect(result.success).toBe(true);
  });

  it("should_accept_no_changes_flag", () => {
    const result = quickUpdateSchema.safeParse({
      profile_id: validProfileId,
      no_changes: "true",
    });
    expect(result.success).toBe(true);
  });

  it("should_reject_invalid_profile_id", () => {
    const result = quickUpdateSchema.safeParse({
      profile_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("should_reject_job_title_over_200_chars", () => {
    const result = quickUpdateSchema.safeParse({
      profile_id: validProfileId,
      job_title: "x".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("should_accept_empty_tag_type_ids_array", () => {
    const result = quickUpdateSchema.safeParse({
      profile_id: validProfileId,
      tag_type_ids: [],
    });
    expect(result.success).toBe(true);
  });
});
