"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/app/(auth)/actions";
import { NotificationBell } from "./notification-bell";
import { useNotifications } from "@/app/(main)/notifications/components/notifications-provider";
import type { NavbarUserData } from "./main-navbar";

interface MainNavbarClientProps {
  user: NavbarUserData;
}

function UserAvatar({ user }: { user: NavbarUserData }) {
  const initials = user.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : user.email.charAt(0).toUpperCase();

  if (user.photoUrl) {
    return (
      <img
        src={user.photoUrl}
        alt={user.fullName ?? "Profile"}
        className="h-8 w-8 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
      {initials}
    </div>
  );
}

function MobileNotificationsLink({ onClick }: { onClick: () => void }) {
  const { unreadCount } = useNotifications();
  const t = useTranslations("nav");
  return (
    <Link
      href="/notifications"
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      onClick={onClick}
    >
      {t("notifications")}
      {unreadCount > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}

export function MainNavbarClient({ user }: MainNavbarClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = useTranslations("nav");

  const navLinks = [
    { href: "/dashboard", label: t("dashboard") },
    { href: "/directory", label: t("directory") },
    { href: "/map", label: t("map") },
    { href: "/connections", label: t("connections") },
    { href: "/messages", label: t("messages") },
    { href: "/groups", label: t("groups") },
    { href: "/verification", label: t("verification") },
  ];

  const profileHref = user.profileId
    ? `/profile/${user.profileId}`
    : "/onboarding";

  const isAdmin = user.role === "admin";
  const isModerator = user.role === "moderator";

  return (
    <nav className="border-b bg-background" aria-label="Main navigation">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="text-lg font-bold tracking-tight"
        >
          AlumNet
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
              {link.href === "/connections" &&
                user.pendingConnectionCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white animate-in zoom-in-50 duration-300">
                    {user.pendingConnectionCount}
                  </span>
                )}
              {link.href === "/messages" &&
                user.unreadMessageCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white animate-in zoom-in-50 duration-300">
                    {user.unreadMessageCount > 99
                      ? "99+"
                      : user.unreadMessageCount}
                  </span>
                )}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin/verification"
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {t("admin")}
            </Link>
          )}
          {isModerator && (
            <Link
              href="/moderation/reports"
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {t("moderation")}
            </Link>
          )}
        </div>

        {/* Desktop notification bell + user menu */}
        <div className="hidden items-center gap-2 md:flex">
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-2 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={t("userMenu")}
            >
              <UserAvatar user={user} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">
                  {user.fullName ?? t("welcome")}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                render={<Link href={profileHref} />}
              >
                {t("myProfile")}
              </DropdownMenuItem>
              <DropdownMenuItem
                render={<Link href="/profile/edit" />}
              >
                {t("editProfile")}
              </DropdownMenuItem>
              <DropdownMenuItem
                render={<Link href="/settings/notifications" />}
              >
                {t("settings")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  const form = document.getElementById("navbar-logout-form") as HTMLFormElement;
                  form?.requestSubmit();
                }}
              >
                {t("signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <form id="navbar-logout-form" action={logout} className="hidden">
            <button type="submit" />
          </form>
        </div>

        {/* Mobile hamburger button */}
        <button
          className="flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
          aria-label={mobileMenuOpen ? t("closeMenu") : t("openMenu")}
        >
          {mobileMenuOpen ? (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div
          id="mobile-menu"
          className="border-t md:hidden"
        >
          <div className="space-y-1 px-4 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
                {link.href === "/connections" &&
                  user.pendingConnectionCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                      {user.pendingConnectionCount}
                    </span>
                  )}
                {link.href === "/messages" &&
                  user.unreadMessageCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1 text-[11px] font-bold text-white">
                      {user.unreadMessageCount > 99
                        ? "99+"
                        : user.unreadMessageCount}
                    </span>
                  )}
              </Link>
            ))}
            <MobileNotificationsLink onClick={() => setMobileMenuOpen(false)} />
            <Link
              href={profileHref}
              className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t("myProfile")}
            </Link>
            <Link
              href="/settings/notifications"
              className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t("settings")}
            </Link>
            {isAdmin && (
              <Link
                href="/admin/verification"
                className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t("admin")}
              </Link>
            )}
            {isModerator && (
              <Link
                href="/moderation/reports"
                className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t("moderation")}
              </Link>
            )}
          </div>
          <div className="border-t px-4 py-3">
            <div className="flex items-center gap-3 px-3 pb-3">
              <UserAvatar user={user} />
              <div>
                <p className="text-sm font-medium">
                  {user.fullName ?? t("welcome")}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <form action={logout}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="w-full"
              >
                {t("signOut")}
              </Button>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}
