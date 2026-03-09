import { describe, it, expect, vi, beforeEach } from "vitest";
import { createProfile } from "./actions";

// Mock Supabase client
const mockSingle = vi.fn();
const mockSelect = vi.fn(() => ({ single: mockSingle }));
const mockInsert = vi.fn(() => ({ select: mockSelect }));
const mockEq = vi.fn();
const mockSelectCount = vi.fn();
const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn(() => ({
  data: { publicUrl: "https://example.com/avatars/test.jpg" },
}));
const mockGetUser = vi.fn();

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: vi.fn((table: string) => {
    if (table === "profiles") {
      return {
        insert: mockInsert,
        select: (cols: string, opts?: { count?: string; head?: boolean }) => {
          if (opts?.head) {
            return { eq: () => ({ count: 0, error: null }) };
          }
          return { eq: mockEq };
        },
      };
    }
    if (table === "specializations") {
      return {
        select: () => ({
          eq: () => ({
            single: () => ({
              data: { industry_id: "industry-1" },
              error: null,
            }),
          }),
        }),
      };
    }
    return {};
  }),
  storage: {
    from: () => ({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    }),
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

describe("createProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockSingle.mockResolvedValue({
      data: { id: "profile-123" },
      error: null,
    });
  });

  it("should_reject_when_full_name_too_short", async () => {
    const fd = makeFormData({
      full_name: "A",
      graduation_year: "2020",
      primary_industry_id: "550e8400-e29b-41d4-a716-446655440000",
    });

    const result = await createProfile(null, fd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.full_name).toBeDefined();
    }
  });

  it("should_reject_when_graduation_year_out_of_range", async () => {
    const fd = makeFormData({
      full_name: "Jane Doe",
      graduation_year: "1800",
      primary_industry_id: "550e8400-e29b-41d4-a716-446655440000",
    });

    const result = await createProfile(null, fd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.graduation_year).toBeDefined();
    }
  });

  it("should_reject_when_industry_id_not_uuid", async () => {
    const fd = makeFormData({
      full_name: "Jane Doe",
      graduation_year: "2020",
      primary_industry_id: "not-a-uuid",
    });

    const result = await createProfile(null, fd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.primary_industry_id).toBeDefined();
    }
  });

  it("should_reject_when_not_logged_in", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const fd = makeFormData({
      full_name: "Jane Doe",
      graduation_year: "2020",
      primary_industry_id: "550e8400-e29b-41d4-a716-446655440000",
    });

    const result = await createProfile(null, fd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("You must be logged in.");
    }
  });

  it("should_reject_when_missing_required_fields", async () => {
    const fd = makeFormData({
      full_name: "",
      graduation_year: "",
      primary_industry_id: "",
    });

    const result = await createProfile(null, fd);

    expect(result.success).toBe(false);
  });

  it("should_succeed_with_valid_required_fields", async () => {
    // Override from mock to return count=0 for profile existence check
    mockSupabase.from = vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          insert: (data: unknown) => ({
            select: () => ({
              single: () => ({
                data: { id: "profile-123" },
                error: null,
              }),
            }),
          }),
          select: (cols: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return { eq: () => ({ count: 0, error: null }) };
            }
            return { eq: mockEq };
          },
        };
      }
      return {};
    });

    const fd = makeFormData({
      full_name: "Jane Doe",
      graduation_year: "2020",
      primary_industry_id: "550e8400-e29b-41d4-a716-446655440000",
    });

    const result = await createProfile(null, fd);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.profileId).toBe("profile-123");
    }
  });
});
