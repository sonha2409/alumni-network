"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/app/(auth)/actions";
import type { ActionResult } from "@/lib/types";

export function ForgotPasswordForm() {
  const t = useTranslations("auth.forgotPassword");
  const tc = useTranslations("common");
  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(resetPassword, null);

  if (state?.success) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-sm text-muted-foreground">
          {t("successMessage")}
        </p>
        <Link
          href="/login"
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {tc("backToSignIn")}
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

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? t("sending") : t("sendResetLink")}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t("rememberPassword")}{" "}
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
