import { describe, it, expect } from "vitest";
import { profileStalenessEmail } from "./email-templates";

describe("profileStalenessEmail", () => {
  it("should_generate_email_with_months_text", () => {
    const result = profileStalenessEmail(
      "John Doe",
      6,
      "http://localhost:3000/settings/quick-update",
      "user-123"
    );

    expect(result.subject).toBe("Is your PTNKAlum profile still up to date?");
    expect(result.html).toContain("John Doe");
    expect(result.html).toContain("6 months ago");
    expect(result.html).toContain("Update My Profile");
    expect(result.html).toContain("http://localhost:3000/settings/quick-update");
    expect(result.html).toContain("unsubscribe");
  });

  it("should_generate_email_with_years_text_when_over_12_months", () => {
    const result = profileStalenessEmail(
      "Jane Smith",
      24,
      "http://localhost:3000/settings/quick-update",
      "user-456"
    );

    expect(result.html).toContain("2 years ago");
    expect(result.html).toContain("Jane Smith");
  });

  it("should_generate_email_with_singular_year_text", () => {
    const result = profileStalenessEmail(
      "Alice",
      12,
      "http://localhost:3000/settings/quick-update",
      "user-789"
    );

    expect(result.html).toContain("1 year ago");
  });

  it("should_generate_email_with_singular_month_text", () => {
    const result = profileStalenessEmail(
      "Bob",
      1,
      "http://localhost:3000/settings/quick-update",
      "user-101"
    );

    expect(result.html).toContain("1 month ago");
    // Should NOT say "months" (plural)
    expect(result.html).not.toContain("1 months ago");
  });

  it("should_escape_html_in_user_name", () => {
    const result = profileStalenessEmail(
      '<script>alert("xss")</script>',
      6,
      "http://localhost:3000/settings/quick-update",
      "user-xss"
    );

    expect(result.html).not.toContain("<script>");
    expect(result.html).toContain("&lt;script&gt;");
  });
});
