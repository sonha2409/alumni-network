"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell, Globe, Lock, UserCog } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function SettingsNav() {
  const pathname = usePathname();
  const t = useTranslations("settings");

  const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
    { href: "/settings/notifications", label: t("tabNotifications"), icon: Bell },
    { href: "/settings/privacy", label: t("tabPrivacy"), icon: Lock },
    { href: "/settings/language", label: t("tabLanguage"), icon: Globe },
    { href: "/settings/account", label: t("tabAccount"), icon: UserCog },
  ];

  return (
    <nav className="mb-8 flex gap-1 border-b border-border/60" aria-label="Settings navigation">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-all duration-200",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-primary/30 hover:text-foreground"
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
