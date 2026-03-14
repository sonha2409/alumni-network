"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { updatePassword } from "@/app/(auth)/actions";
import type { ActionResult } from "@/lib/types";

export function ResetPasswordForm() {
  const t = useTranslations("auth.resetPassword");
  const tc = useTranslations("common");
  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(updatePassword, null);

  if (state?.success) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-sm text-muted-foreground">
          {t("successMessage")}
        </p>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t("goToDashboard")}
        </Link>
      </div>
    );
  }

  return (
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
        <Label htmlFor="password">{t("newPassword")}</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">{t("confirmNewPassword")}</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          required
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
        {isPending ? t("updating") : t("updatePassword")}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {tc("backToSignIn")}
        </Link>
      </p>
    </form>
  );
}
