"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { login } from "@/app/(auth)/actions";
import { GoogleSignInButton } from "@/app/(auth)/google-sign-in-button";
import type { ActionResult } from "@/lib/types";

export function LoginForm() {
  const t = useTranslations("auth.login");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const emailConfirmed = searchParams.get("email_confirmed") === "true";

  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(login, null);

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
      {emailConfirmed && (
        <div
          role="status"
          className="rounded-lg border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400"
        >
          {t("emailConfirmed")}
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
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{tc("password")}</Label>
          <Link
            href="/forgot-password"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            {t("forgotPassword")}
          </Link>
        </div>
        <PasswordInput
          id="password"
          name="password"
          placeholder={tc("passwordPlaceholder")}
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
        {isPending ? t("signingIn") : t("signIn")}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link
          href="/signup"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t("signUp")}
        </Link>
      </p>
    </form>
    </div>
  );
}
