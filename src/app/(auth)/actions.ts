"use server";

import { redirect } from "next/navigation";
import { z } from "zod/v4";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const signupSchema = z
  .object({
    email: z.email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const loginSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const resetPasswordSchema = z.object({
  email: z.email("Please enter a valid email address"),
});

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

export async function signup(
  _prevState: ActionResult<{ userId: string }> | null,
  formData: FormData
): Promise<ActionResult<{ userId: string }>> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors,
    };
  }

  const { email, password } = parsed.data;
  const supabase = await createClient();

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?next=/onboarding`,
      },
    });

    if (error) {
      console.error("[ServerAction:signup]", { email, error: error.message });

      // Fix 8: Don't reveal whether email is already registered (OWASP recommendation).
      // Return generic success so user sees "Check your email" message.
      if (error.message.toLowerCase().includes("already registered")) {
        return { success: true, data: { userId: "" } };
      }

      return {
        success: false,
        error: "Something went wrong. Please try again.",
      };
    }

    if (!data.user) {
      return { success: false, error: "Something went wrong. Please try again." };
    }

    // Email confirmation enabled: session is null until user confirms email.
    // Return empty userId so the client shows "Check your email" message.
    if (!data.session) {
      return { success: true, data: { userId: "" } };
    }

    return { success: true, data: { userId: data.user.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:signup]", { email, error: message });
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export async function login(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors,
    };
  }

  const { email, password } = parsed.data;
  const supabase = await createClient();

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("[ServerAction:login]", { email, error: error.message });
      return {
        success: false,
        error: "Invalid email or password.",
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:login]", { email, error: message });
    return { success: false, error: "Something went wrong. Please try again." };
  }

  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  const supabase = await createClient();

  try {
    await supabase.auth.signOut();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:logout]", { error: message });
  }

  redirect("/");
}

export async function resetPassword(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const raw = { email: formData.get("email") };

  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors,
    };
  }

  const { email } = parsed.data;
  const supabase = await createClient();

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`,
    });

    if (error) {
      console.error("[ServerAction:resetPassword]", {
        email,
        error: error.message,
      });
      // Don't reveal whether the email exists — always return success
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:resetPassword]", { email, error: message });
  }

  // Always return success to prevent email enumeration
  return { success: true, data: undefined };
}
