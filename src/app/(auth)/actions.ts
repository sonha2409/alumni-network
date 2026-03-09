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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error("[ServerAction:signup]", { email, error: error.message });

      if (error.message.toLowerCase().includes("already registered")) {
        return {
          success: false,
          error: "An account with this email already exists.",
        };
      }

      return {
        success: false,
        error: "Something went wrong. Please try again.",
      };
    }

    if (!data.user) {
      return { success: false, error: "Something went wrong. Please try again." };
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
