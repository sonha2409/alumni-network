import { describe, it, expect } from "vitest";

import {
  eventInputSchema,
  hasMajorEdit,
  canCreateEvent,
  MAX_EVENTS_PER_WEEK,
} from "./schemas";

/**
 * Unit tests for the pure helpers in the Events feature.
 * Integration tests (DB-hitting) are deferred to F45a's test harness.
 */

function futureIso(hoursFromNow: number): string {
  return new Date(Date.now() + hoursFromNow * 3600_000).toISOString();
}

describe("eventInputSchema", () => {
  const base = {
    title: "Reunion 2026",
    description: "Annual gathering",
    start_time: futureIso(48),
    end_time: futureIso(50),
    event_timezone: "Asia/Ho_Chi_Minh",
    is_public: true,
    capacity: 20,
    cover_image_url: "https://example.com/cover.jpg",
  };

  it("should_accept_valid_physical_event", () => {
    const res = eventInputSchema.safeParse({
      ...base,
      location_type: "physical",
      address: "123 Le Loi, District 1",
    });
    expect(res.success).toBe(true);
  });

  it("should_accept_valid_virtual_event", () => {
    const res = eventInputSchema.safeParse({
      ...base,
      location_type: "virtual",
      virtual_url: "https://meet.example.com/abc",
    });
    expect(res.success).toBe(true);
  });

  it("should_accept_valid_hybrid_event", () => {
    const res = eventInputSchema.safeParse({
      ...base,
      location_type: "hybrid",
      address: "123 Le Loi",
      virtual_url: "https://meet.example.com/abc",
    });
    expect(res.success).toBe(true);
  });

  it("should_reject_when_end_before_start", () => {
    const res = eventInputSchema.safeParse({
      ...base,
      location_type: "physical",
      address: "123 Le Loi",
      start_time: futureIso(50),
      end_time: futureIso(48),
    });
    expect(res.success).toBe(false);
  });

  it("should_reject_when_start_in_past", () => {
    const res = eventInputSchema.safeParse({
      ...base,
      location_type: "physical",
      address: "123 Le Loi",
      start_time: new Date(Date.now() - 3600_000).toISOString(),
      end_time: futureIso(2),
    });
    expect(res.success).toBe(false);
  });

  it("should_reject_when_physical_missing_address", () => {
    const res = eventInputSchema.safeParse({
      ...base,
      location_type: "physical",
      // address absent
    });
    expect(res.success).toBe(false);
  });

  it("should_reject_when_virtual_missing_url", () => {
    const res = eventInputSchema.safeParse({
      ...base,
      location_type: "virtual",
    });
    expect(res.success).toBe(false);
  });

  it("should_reject_when_title_too_short", () => {
    const res = eventInputSchema.safeParse({
      ...base,
      location_type: "physical",
      address: "123 Le Loi",
      title: "Hi",
    });
    expect(res.success).toBe(false);
  });

  it("should_reject_when_capacity_negative", () => {
    const res = eventInputSchema.safeParse({
      ...base,
      location_type: "physical",
      address: "123 Le Loi",
      capacity: -5,
    });
    expect(res.success).toBe(false);
  });
});

describe("hasMajorEdit", () => {
  const base = {
    start_time: "2026-05-01T10:00:00.000Z",
    end_time: "2026-05-01T12:00:00.000Z",
    location_type: "physical" as const,
    address: "123 Le Loi",
    virtual_url: null,
  };

  it("should_return_false_when_nothing_changed", () => {
    expect(hasMajorEdit(base, { ...base })).toBe(false);
  });

  it("should_return_true_when_start_time_changed", () => {
    expect(
      hasMajorEdit(base, { ...base, start_time: "2026-05-02T10:00:00.000Z" })
    ).toBe(true);
  });

  it("should_return_true_when_address_changed", () => {
    expect(hasMajorEdit(base, { ...base, address: "456 Nguyen Hue" })).toBe(
      true
    );
  });

  it("should_return_true_when_location_type_changed", () => {
    expect(
      hasMajorEdit(base, {
        ...base,
        location_type: "hybrid",
        virtual_url: "https://meet.example.com/x",
      })
    ).toBe(true);
  });

  it("should_return_true_when_end_time_changed", () => {
    expect(
      hasMajorEdit(base, { ...base, end_time: "2026-05-01T14:00:00.000Z" })
    ).toBe(true);
  });
});

describe("canCreateEvent (rate limit)", () => {
  it("should_allow_when_below_cap", () => {
    expect(canCreateEvent(0)).toBe(true);
    expect(canCreateEvent(1)).toBe(true);
    expect(canCreateEvent(2)).toBe(true);
  });

  it("should_reject_when_at_or_above_cap", () => {
    expect(canCreateEvent(MAX_EVENTS_PER_WEEK)).toBe(false);
    expect(canCreateEvent(MAX_EVENTS_PER_WEEK + 1)).toBe(false);
  });
});
