"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/app/(auth)/actions";
import type { ActionResult } from "@/lib/types";

export function LoginForm() {
  const searchParams = useSearchParams();
  const emailConfirmed = searchParams.get("email_confirmed") === "true";

  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(login, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {emailConfirmed && (
        <div
          role="status"
          className="rounded-lg border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400"
        >
          Email confirmed! Please sign in to continue.
        </div>
      )}

      {state?.success === false && !state.fieldErrors && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
          aria-invalid={
            state?.success === false && state.fieldErrors?.email
              ? true
              : undefined
          }
          aria-describedby={
            state?.success === false && state.fieldErrors?.email
              ? "email-error"
              : undefined
          }
        />
        {state?.success === false && state.fieldErrors?.email && (
          <p id="email-error" className="text-sm text-destructive">
            {state.fieldErrors.email[0]}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
          aria-invalid={
            state?.success === false && state.fieldErrors?.password
              ? true
              : undefined
          }
          aria-describedby={
            state?.success === false && state.fieldErrors?.password
              ? "password-error"
              : undefined
          }
        />
        {state?.success === false && state.fieldErrors?.password && (
          <p id="password-error" className="text-sm text-destructive">
            {state.fieldErrors.password[0]}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
