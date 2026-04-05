"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

export function SettingsNav() {
  const pathname = usePathname();
  const t = useTranslations("settings");

  const NAV_ITEMS = [
    { href: "/settings/notifications", label: t("tabNotifications") },
    { href: "/settings/language", label: t("tabLanguage") },
    { href: "/settings/account", label: t("tabAccount") },
  ] as const;

  return (
    <nav className="mb-8 flex gap-1 border-b border-border/60" aria-label="Settings navigation">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium transition-all duration-200",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-primary/30 hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
