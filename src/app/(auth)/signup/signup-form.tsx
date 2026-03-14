"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { signup } from "@/app/(auth)/actions";
import { GoogleSignInButton } from "@/app/(auth)/google-sign-in-button";
import type { ActionResult } from "@/lib/types";

export function SignupForm() {
  const t = useTranslations("auth.signup");
  const tc = useTranslations("common");
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<
    ActionResult<{ userId: string }> | null,
    FormData
  >(signup, null);

  useEffect(() => {
    if (state?.success) {
      if (state.data?.userId) {
        toast.success(t("successWithProfile"));
        router.push("/onboarding");
      } else {
        // Email confirmation required, or duplicate email (Fix 8: prevent enumeration).
        // Both cases show the same message to avoid leaking account existence.
        toast.success(t("successWithEmail"));
        router.push("/login");
      }
    }
  }, [state, router, t]);

  const to = useTranslations("auth.oauth");

  return (
    <div className="flex flex-col gap-4">
      <GoogleSignInButton />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            {to("orContinueWith")}
          </span>
        </div>
      </div>

    <form action={formAction} className="flex flex-col gap-4">
      {state?.success === false && !state.fieldErrors && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{tc("email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder={tc("emailPlaceholder")}
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
        <Label htmlFor="password">{tc("password")}</Label>
        <PasswordInput
          id="password"
          name="password"
          placeholder={tc("passwordPlaceholder")}
          autoComplete="new-password"
          required
          minLength={8}
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          placeholder={tc("passwordPlaceholder")}
          autoComplete="new-password"
          required
          minLength={8}
          aria-invalid={
            state?.success === false && state.fieldErrors?.confirmPassword
              ? true
              : undefined
          }
          aria-describedby={
            state?.success === false && state.fieldErrors?.confirmPassword
              ? "confirmPassword-error"
              : undefined
          }
        />
        {state?.success === false && state.fieldErrors?.confirmPassword && (
          <p id="confirmPassword-error" className="text-sm text-destructive">
            {state.fieldErrors.confirmPassword[0]}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? t("creatingAccount") : t("createAccount")}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t("hasAccount")}{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t("signIn")}
        </Link>
      </p>
    </form>
    </div>
  );
}
