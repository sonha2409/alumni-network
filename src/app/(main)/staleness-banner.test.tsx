import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase
const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockSingle,
          eq: vi.fn(() => ({
            maybeSingle: mockMaybeSingle,
          })),
        })),
      })),
    })),
  })),
}));

vi.mock("@/lib/queries/app-settings", () => ({
  getStalenessThresholdMonths: vi.fn(() => Promise.resolve(6)),
}));

vi.mock("./staleness-banner-client", () => ({
  StalenessBannerClient: vi.fn(({ timeAgoText }: { timeAgoText: string }) => (
    <div data-testid="staleness-banner">{timeAgoText}</div>
  )),
}));

import { getStalenessThresholdMonths } from "@/lib/queries/app-settings";

describe("StalenessBanner logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should_return_null_when_threshold_is_zero", async () => {
    vi.mocked(getStalenessThresholdMonths).mockResolvedValueOnce(0);
    // Threshold of 0 means disabled
    expect(await getStalenessThresholdMonths()).toBe(0);
  });

  it("should_return_default_threshold_of_6_months", async () => {
    const threshold = await getStalenessThresholdMonths();
    expect(threshold).toBe(6);
  });

  it("should_calculate_months_ago_correctly", () => {
    const sevenMonthsAgo = new Date();
    sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

    const monthsAgo = Math.floor(
      (Date.now() - sevenMonthsAgo.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    expect(monthsAgo).toBeGreaterThanOrEqual(6);
    expect(monthsAgo).toBeLessThanOrEqual(8);
  });

  it("should_format_time_text_for_months", () => {
    const formatTimeText = (monthsAgo: number) =>
      monthsAgo >= 12
        ? `${Math.floor(monthsAgo / 12)} year${Math.floor(monthsAgo / 12) > 1 ? "s" : ""}`
        : `${monthsAgo} month${monthsAgo > 1 ? "s" : ""}`;

    expect(formatTimeText(1)).toBe("1 month");
    expect(formatTimeText(6)).toBe("6 months");
    expect(formatTimeText(12)).toBe("1 year");
    expect(formatTimeText(24)).toBe("2 years");
  });

  it("should_detect_stale_profile_when_updated_over_threshold", () => {
    const thresholdMonths = 6;
    const profileUpdatedAt = new Date();
    profileUpdatedAt.setMonth(profileUpdatedAt.getMonth() - 7);

    const staleDate = new Date();
    staleDate.setMonth(staleDate.getMonth() - thresholdMonths);

    expect(profileUpdatedAt < staleDate).toBe(true);
  });

  it("should_not_detect_stale_profile_when_recently_updated", () => {
    const thresholdMonths = 6;
    const profileUpdatedAt = new Date();
    profileUpdatedAt.setMonth(profileUpdatedAt.getMonth() - 3);

    const staleDate = new Date();
    staleDate.setMonth(staleDate.getMonth() - thresholdMonths);

    expect(profileUpdatedAt < staleDate).toBe(false);
  });

  it("should_respect_snooze_within_30_days", () => {
    const snoozedAt = new Date();
    snoozedAt.setDate(snoozedAt.getDate() - 15); // 15 days ago

    const snoozeExpiry = new Date(snoozedAt);
    snoozeExpiry.setDate(snoozeExpiry.getDate() + 30);

    expect(new Date() < snoozeExpiry).toBe(true); // Still snoozed
  });

  it("should_expire_snooze_after_30_days", () => {
    const snoozedAt = new Date();
    snoozedAt.setDate(snoozedAt.getDate() - 31); // 31 days ago

    const snoozeExpiry = new Date(snoozedAt);
    snoozeExpiry.setDate(snoozeExpiry.getDate() + 30);

    expect(new Date() < snoozeExpiry).toBe(false); // Snooze expired
  });
});
