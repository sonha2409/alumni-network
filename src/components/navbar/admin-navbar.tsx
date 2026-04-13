"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  Flag,
  ShieldCheck,
  Users,
  Tags,
  BarChart3,
  MapPin,
  Mail,
  Megaphone,
  Settings,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface AdminNavbarProps {
  role: "moderator" | "admin";
}

const linkClass =
  "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground whitespace-nowrap flex items-center gap-1.5";

export function AdminNavbar({ role }: AdminNavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const tAdmin = useTranslations("admin.navbar");
  const tNav = useTranslations("nav");

  return (
    <nav className="border-b border-border/60 bg-background/80 backdrop-blur-xl" aria-label="Admin navigation">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo + desktop links */}
        <div className="flex items-center gap-4 min-w-0">
          <span className="flex-shrink-0 text-lg font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {role === "admin" ? tAdmin("adminTitle") : tAdmin("moderationTitle")}
          </span>

          {/* Desktop nav links — hidden on mobile */}
          <div className="hidden items-center gap-1 md:flex">
            <Link href="/moderation/reports" className={linkClass}>
              <Flag className="size-4" aria-hidden="true" />
              {tAdmin("reports")}
            </Link>
            {role === "admin" && (
              <>
                <Link href="/admin/verification" className={linkClass}>
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  {tNav("verification")}
                </Link>
                <Link href="/admin/users" className={linkClass}>
                  <Users className="size-4" aria-hidden="true" />
                  {tAdmin("users")}
                </Link>
                <Link href="/admin/events" className={linkClass}>
                  <Calendar className="size-4" aria-hidden="true" />
                  {tAdmin("events")}
                </Link>
                <Link href="/admin/taxonomy" className={linkClass}>
                  <Tags className="size-4" aria-hidden="true" />
                  {tAdmin("taxonomy")}
                </Link>
                <Link href="/admin/analytics" className={linkClass}>
                  <BarChart3 className="size-4" aria-hidden="true" />
                  {tAdmin("analytics")}
                </Link>
                <Link href="/admin/map" className={linkClass}>
                  <MapPin className="size-4" aria-hidden="true" />
                  {tNav("map")}
                </Link>
                <Link href="/admin/bulk-invite" className={linkClass}>
                  <Mail className="size-4" aria-hidden="true" />
                  {tAdmin("invite")}
                </Link>
                <Link href="/admin/announcements" className={linkClass}>
                  <Megaphone className="size-4" aria-hidden="true" />
                  {tAdmin("announcements")}
                </Link>
                <Link href="/admin/settings" className={linkClass}>
                  <Settings className="size-4" aria-hidden="true" />
                  {tNav("settings")}
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Right side: back link (desktop) + hamburger (mobile) */}
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className={linkClass + " hidden sm:inline-flex"}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            {tNav("backToApp")}
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted md:hidden"
            aria-label={mobileOpen ? tNav("closeMenu") : tNav("openMenu")}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="border-t bg-background px-4 py-2 md:hidden">
          <div className="flex flex-col gap-1">
            <Link
              href="/moderation/reports"
              className={linkClass}
              onClick={() => setMobileOpen(false)}
            >
              <Flag className="size-4" aria-hidden="true" />
              {tAdmin("reports")}
            </Link>
            {role === "admin" && (
              <>
                <Link
                  href="/admin/verification"
                  className={linkClass}
                  onClick={() => setMobileOpen(false)}
                >
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  {tNav("verification")}
                </Link>
                <Link
                  href="/admin/users"
                  className={linkClass}
                  onClick={() => setMobileOpen(false)}
                >
                  <Users className="size-4" aria-hidden="true" />
                  {tAdmin("users")}
                </Link>
                <Link
                  href="/admin/events"
                  className={linkClass}
                  onClick={() => setMobileOpen(false)}
                >
                  <Calendar className="size-4" aria-hidden="true" />
                  {tAdmin("events")}
                </Link>
                <Link
                  href="/admin/taxonomy"
                  className={linkClass}
                  onClick={() => setMobileOpen(false)}
                >
                  <Tags className="size-4" aria-hidden="true" />
                  {tAdmin("taxonomy")}
                </Link>
                <Link
                  href="/admin/analytics"
                  className={linkClass}
                  onClick={() => setMobileOpen(false)}
                >
                  <BarChart3 className="size-4" aria-hidden="true" />
                  {tAdmin("analytics")}
                </Link>
                <Link
                  href="/admin/map"
                  className={linkClass}
                  onClick={() => setMobileOpen(false)}
                >
                  <MapPin className="size-4" aria-hidden="true" />
                  {tNav("map")}
                </Link>
                <Link
                  href="/admin/bulk-invite"
                  className={linkClass}
                  onClick={() => setMobileOpen(false)}
                >
                  <Mail className="size-4" aria-hidden="true" />
                  {tAdmin("invite")}
                </Link>
                <Link
                  href="/admin/announcements"
                  className={linkClass}
                  onClick={() => setMobileOpen(false)}
                >
                  <Megaphone className="size-4" aria-hidden="true" />
                  {tAdmin("announcements")}
                </Link>
                <Link
                  href="/admin/settings"
                  className={linkClass}
                  onClick={() => setMobileOpen(false)}
                >
                  <Settings className="size-4" aria-hidden="true" />
                  {tNav("settings")}
                </Link>
              </>
            )}
            <hr className="my-1 border-border" />
            <Link
              href="/dashboard"
              className={linkClass}
              onClick={() => setMobileOpen(false)}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              {tNav("backToApp")}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
