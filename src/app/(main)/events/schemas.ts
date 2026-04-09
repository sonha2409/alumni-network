import { z } from "zod/v4";

/**
 * Event input schema — shared between create and update.
 * Flat schema with a superRefine that enforces location-type requirements.
 * Using a flat object (rather than a discriminated union + intersection)
 * keeps parsing robust and matches the validation style used elsewhere.
 */
export const eventInputSchema = z
  .object({
    title: z.string().min(3).max(140),
    description: z.string().max(5000).nullish(),
    location_type: z.enum(["physical", "virtual", "hybrid"]),
    address: z.string().max(300).nullish(),
    virtual_url: z.string().url().max(500).nullish(),
    start_time: z.string().datetime(),
    end_time: z.string().datetime(),
    event_timezone: z.string().min(1).max(64),
    is_public: z.boolean(),
    capacity: z.number().int().positive().nullish(),
    cover_image_url: z.string().url().nullish(),
  })
  .superRefine((d, ctx) => {
    if (new Date(d.end_time) <= new Date(d.start_time)) {
      ctx.addIssue({
        code: "custom",
        message: "End time must be after start time",
        path: ["end_time"],
      });
    }
    if (new Date(d.start_time) <= new Date()) {
      ctx.addIssue({
        code: "custom",
        message: "Start time must be in the future",
        path: ["start_time"],
      });
    }
    // Location-type requirements
    if (d.location_type !== "virtual") {
      if (!d.address || d.address.trim().length < 3) {
        ctx.addIssue({
          code: "custom",
          message: "Address is required for physical and hybrid events",
          path: ["address"],
        });
      }
    }
    if (d.location_type !== "physical") {
      if (!d.virtual_url) {
        ctx.addIssue({
          code: "custom",
          message: "Meeting URL is required for virtual and hybrid events",
          path: ["virtual_url"],
        });
      }
    }
  });

export type EventInput = z.infer<typeof eventInputSchema>;

export const rsvpStatusSchema = z.enum(["going", "maybe", "cant_go"]);
export const uuidSchema = z.string().uuid();

export const rsvpInputSchema = z.object({
  eventId: uuidSchema,
  status: rsvpStatusSchema,
  plusOneName: z.string().min(1).max(120).nullish(),
  plusOneEmail: z.string().email().max(254).nullish(),
});

/**
 * Fields whose change triggers the edit-cascade (RSVPs get needs_reconfirm).
 */
export const MAJOR_EDIT_FIELDS = [
  "start_time",
  "end_time",
  "location_type",
  "address",
  "virtual_url",
] as const;

export type MajorEditField = (typeof MAJOR_EDIT_FIELDS)[number];

/**
 * Pure helper — returns true if any major field differs between before/after.
 * Extracted for unit testing.
 */
export function hasMajorEdit(
  before: Record<MajorEditField, unknown>,
  after: Record<MajorEditField, unknown>
): boolean {
  return MAJOR_EDIT_FIELDS.some((f) => before[f] !== after[f]);
}

/**
 * Pure helper — given current event count in the rolling window, returns
 * whether the user is allowed to create another event.
 */
export const MAX_EVENTS_PER_WEEK = 3;
export function canCreateEvent(recentEventCount: number): boolean {
  return recentEventCount < MAX_EVENTS_PER_WEEK;
}
