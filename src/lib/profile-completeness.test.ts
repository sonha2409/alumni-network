import { describe, it, expect } from "vitest";
import { calculateProfileCompleteness } from "./profile-completeness";

const emptyFields = {
  full_name: null,
  graduation_year: null,
  primary_industry_id: null,
  photo_url: null,
  bio: null,
  primary_specialization_id: null,
  country: null,
  state_province: null,
  city: null,
  secondary_industry_id: null,
  secondary_specialization_id: null,
};

describe("calculateProfileCompleteness", () => {
  it("should_return_0_when_all_fields_empty", () => {
    expect(calculateProfileCompleteness(emptyFields)).toBe(0);
  });

  it("should_return_100_when_all_fields_filled", () => {
    const result = calculateProfileCompleteness({
      full_name: "Jane Doe",
      graduation_year: 2020,
      primary_industry_id: "uuid-1",
      photo_url: "https://example.com/photo.jpg",
      bio: "About me",
      primary_specialization_id: "uuid-2",
      country: "US",
      state_province: "CA",
      city: "SF",
      secondary_industry_id: "uuid-3",
      secondary_specialization_id: "uuid-4",
    });
    expect(result).toBe(100);
  });

  it("should_return_45_when_only_required_fields_filled", () => {
    const result = calculateProfileCompleteness({
      ...emptyFields,
      full_name: "Jane Doe",
      graduation_year: 2020,
      primary_industry_id: "uuid-1",
    });
    // full_name(15) + graduation_year(15) + primary_industry(15) = 45
    expect(result).toBe(45);
  });

  it("should_award_location_points_when_any_location_field_set", () => {
    const cityOnly = calculateProfileCompleteness({
      ...emptyFields,
      city: "San Francisco",
    });
    const countryOnly = calculateProfileCompleteness({
      ...emptyFields,
      country: "US",
    });
    // Both should get the same 10 points for location
    expect(cityOnly).toBe(10);
    expect(countryOnly).toBe(10);
  });

  it("should_award_photo_points_independently", () => {
    const withPhoto = calculateProfileCompleteness({
      ...emptyFields,
      photo_url: "https://example.com/photo.jpg",
    });
    expect(withPhoto).toBe(15);
  });

  it("should_award_bio_points_independently", () => {
    const withBio = calculateProfileCompleteness({
      ...emptyFields,
      bio: "I work in tech",
    });
    expect(withBio).toBe(10);
  });

  it("should_award_secondary_fields_5_points_each", () => {
    const result = calculateProfileCompleteness({
      ...emptyFields,
      secondary_industry_id: "uuid-1",
      secondary_specialization_id: "uuid-2",
    });
    expect(result).toBe(10);
  });

  it("should_not_exceed_100", () => {
    const result = calculateProfileCompleteness({
      full_name: "Jane Doe",
      graduation_year: 2020,
      primary_industry_id: "uuid-1",
      photo_url: "https://example.com/photo.jpg",
      bio: "About me",
      primary_specialization_id: "uuid-2",
      country: "US",
      state_province: "CA",
      city: "SF",
      secondary_industry_id: "uuid-3",
      secondary_specialization_id: "uuid-4",
    });
    expect(result).toBeLessThanOrEqual(100);
  });
});
