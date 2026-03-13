"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { locales, localeNames, type Locale } from "@/i18n/config";
import { updateLanguagePreference } from "./actions";

export default function LanguageSettingsPage() {
  const t = useTranslations("settings");
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(locale: Locale) {
    if (locale === currentLocale) return;

    startTransition(async () => {
      const result = await updateLanguagePreference(locale);
      if (result.success) {
        toast.success(t("languageUpdated"));
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">{t("language")}</h2>
      <p className="mb-6 text-sm text-muted-foreground">{t("languageDesc")}</p>
      <div className="space-y-1">
        {locales.map((locale) => (
          <label
            key={locale}
            className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{locale === "en" ? "🇺🇸" : "🇻🇳"}</span>
              <div>
                <p className="text-sm font-medium">{localeNames[locale]}</p>
                <p className="text-sm text-muted-foreground">{locale.toUpperCase()}</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={currentLocale === locale}
              aria-label={localeNames[locale]}
              disabled={isPending}
              onClick={() => handleChange(locale)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                currentLocale === locale ? "bg-primary" : "bg-input"
              }`}
            >
              <span
                className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                  currentLocale === locale ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </label>
        ))}
      </div>
    </div>
  );
}
