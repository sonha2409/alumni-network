import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase client
const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockUpdateUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        signUp: mockSignUp,
        signInWithPassword: mockSignInWithPassword,
        signOut: mockSignOut,
        resetPasswordForEmail: mockResetPasswordForEmail,
        updateUser: mockUpdateUser,
      },
    })
  ),
}));

// Mock next/navigation redirect — it throws to halt execution
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

// Import after mocks
import { signup, login, resetPassword, updatePassword } from "./actions";

function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value);
  }
  return fd;
}

describe("signup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should_return_field_errors_when_email_invalid", async () => {
    const result = await signup(null, formData({
      email: "not-an-email",
      password: "12345678",
      confirmPassword: "12345678",
    }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.email).toBeDefined();
    }
  });

  it("should_return_field_errors_when_password_too_short", async () => {
    const result = await signup(null, formData({
      email: "test@example.com",
      password: "short",
      confirmPassword: "short",
    }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.password).toBeDefined();
    }
  });

  it("should_return_field_errors_when_passwords_dont_match", async () => {
    const result = await signup(null, formData({
      email: "test@example.com",
      password: "12345678",
      confirmPassword: "87654321",
    }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.confirmPassword).toBeDefined();
    }
  });

  it("should_return_success_when_signup_succeeds", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const result = await signup(null, formData({
      email: "test@example.com",
      password: "12345678",
      confirmPassword: "12345678",
    }));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userId).toBe("user-123");
    }
    expect(mockSignUp).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "12345678",
    });
  });

  it("should_return_friendly_error_when_email_already_registered", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: "User already registered" },
    });

    const result = await signup(null, formData({
      email: "existing@example.com",
      password: "12345678",
      confirmPassword: "12345678",
    }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("already exists");
    }
  });

  it("should_return_generic_error_when_supabase_fails", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: "Internal server error" },
    });

    const result = await signup(null, formData({
      email: "test@example.com",
      password: "12345678",
      confirmPassword: "12345678",
    }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Something went wrong");
    }
  });
});

describe("login", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should_return_field_errors_when_email_invalid", async () => {
    const result = await login(null, formData({
      email: "not-an-email",
      password: "12345678",
    }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.email).toBeDefined();
    }
  });

  it("should_return_field_errors_when_password_empty", async () => {
    const result = await login(null, formData({
      email: "test@example.com",
      password: "",
    }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.password).toBeDefined();
    }
  });

  it("should_redirect_to_dashboard_when_login_succeeds", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });

    await expect(
      login(null, formData({
        email: "test@example.com",
        password: "12345678",
      }))
    ).rejects.toThrow("REDIRECT:/dashboard");

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "12345678",
    });
  });

  it("should_return_error_when_credentials_invalid", async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });

    const result = await login(null, formData({
      email: "test@example.com",
      password: "wrongpassword",
    }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Invalid email or password");
    }
  });
});

describe("resetPassword", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should_return_field_errors_when_email_invalid", async () => {
    const result = await resetPassword(null, formData({
      email: "not-an-email",
    }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.email).toBeDefined();
    }
  });

  it("should_return_success_regardless_of_email_existence", async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });

    const result = await resetPassword(null, formData({
      email: "test@example.com",
    }));

    expect(result.success).toBe(true);
  });

  it("should_return_success_even_when_supabase_errors", async () => {
    mockResetPasswordForEmail.mockResolvedValue({
      error: { message: "User not found" },
    });

    const result = await resetPassword(null, formData({
      email: "nonexistent@example.com",
    }));

    // Should still succeed to prevent email enumeration
    expect(result.success).toBe(true);
  });
});

describe("updatePassword", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should_return_field_errors_when_password_too_short", async () => {
    const result = await updatePassword(null, formData({
      password: "short",
      confirmPassword: "short",
    }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.password).toBeDefined();
    }
  });

  it("should_return_field_errors_when_passwords_dont_match", async () => {
    const result = await updatePassword(null, formData({
      password: "12345678",
      confirmPassword: "87654321",
    }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.confirmPassword).toBeDefined();
    }
  });

  it("should_return_success_when_password_updated", async () => {
    mockUpdateUser.mockResolvedValue({ error: null });

    const result = await updatePassword(null, formData({
      password: "newpassword123",
      confirmPassword: "newpassword123",
    }));

    expect(result.success).toBe(true);
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: "newpassword123" });
  });

  it("should_return_error_when_supabase_fails", async () => {
    mockUpdateUser.mockResolvedValue({
      error: { message: "Password update failed" },
    });

    const result = await updatePassword(null, formData({
      password: "newpassword123",
      confirmPassword: "newpassword123",
    }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Failed to update password");
    }
  });
});
