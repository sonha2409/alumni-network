"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Users,
  MapPin,
  UserCheck,
  MessageSquare,
  UsersRound,
  ShieldCheck,
  Shield,
  Menu,
  X,
  User,
  Pencil,
  Settings,
  LogOut,
  Bell,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
import { useUnreadMessages } from "@/app/(main)/messages/components/unread-messages-provider";
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
      <Image
        src={user.photoUrl}
        alt={user.fullName ?? "Profile"}
        width={32}
        height={32}
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
      <Bell className="size-4" aria-hidden="true" />
      {t("notifications")}
      {unreadCount > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}

function MessageBadge({ className }: { className?: string }) {
  const { unreadCount } = useUnreadMessages();
  if (unreadCount <= 0) return null;
  return (
    <span className={className}>
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  );
}

export function MainNavbarClient({ user }: MainNavbarClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = useTranslations("nav");

  const navLinks: { href: string; label: string; icon: LucideIcon }[] = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/directory", label: t("directory"), icon: Users },
    { href: "/map", label: t("map"), icon: MapPin },
    { href: "/connections", label: t("connections"), icon: UserCheck },
    { href: "/messages", label: t("messages"), icon: MessageSquare },
    { href: "/groups", label: t("groups"), icon: UsersRound },
    { href: "/verification", label: t("verification"), icon: ShieldCheck },
  ];

  const profileHref = user.profileId
    ? `/profile/${user.profileId}`
    : "/onboarding";

  const isAdmin = user.role === "admin";
  const isModerator = user.role === "moderator";

  return (
    <nav className="border-b border-border/60 bg-background/80 backdrop-blur-xl" aria-label="Main navigation">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="text-lg font-bold tracking-tight"
        >
          <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">AlumNet</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Icon className="size-4" aria-hidden="true" />
                {link.label}
                {link.href === "/connections" &&
                  user.pendingConnectionCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white animate-in zoom-in-50 duration-300">
                      {user.pendingConnectionCount}
                    </span>
                  )}
                {link.href === "/messages" && (
                    <MessageBadge className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white animate-in zoom-in-50 duration-300" />
                  )}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin/verification"
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Shield className="size-4" aria-hidden="true" />
              {t("admin")}
            </Link>
          )}
          {isModerator && (
            <Link
              href="/moderation/reports"
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Shield className="size-4" aria-hidden="true" />
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
                <User className="size-4" aria-hidden="true" />
                {t("myProfile")}
              </DropdownMenuItem>
              <DropdownMenuItem
                render={<Link href="/profile/edit" />}
              >
                <Pencil className="size-4" aria-hidden="true" />
                {t("editProfile")}
              </DropdownMenuItem>
              <DropdownMenuItem
                render={<Link href="/settings/notifications" />}
              >
                <Settings className="size-4" aria-hidden="true" />
                {t("settings")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  const form = document.getElementById("navbar-logout-form") as HTMLFormElement;
                  form?.requestSubmit();
                }}
              >
                <LogOut className="size-4" aria-hidden="true" />
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
            <X className="size-5" aria-hidden="true" />
          ) : (
            <Menu className="size-5" aria-hidden="true" />
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
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {link.label}
                  {link.href === "/connections" &&
                    user.pendingConnectionCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                        {user.pendingConnectionCount}
                      </span>
                    )}
                  {link.href === "/messages" && (
                      <MessageBadge className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1 text-[11px] font-bold text-white" />
                    )}
                </Link>
              );
            })}
            <MobileNotificationsLink onClick={() => setMobileMenuOpen(false)} />
            <Link
              href={profileHref}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              <User className="size-4" aria-hidden="true" />
              {t("myProfile")}
            </Link>
            <Link
              href="/settings/notifications"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Settings className="size-4" aria-hidden="true" />
              {t("settings")}
            </Link>
            {isAdmin && (
              <Link
                href="/admin/verification"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Shield className="size-4" aria-hidden="true" />
                {t("admin")}
              </Link>
            )}
            {isModerator && (
              <Link
                href="/moderation/reports"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Shield className="size-4" aria-hidden="true" />
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
                <LogOut className="size-4" aria-hidden="true" />
                {t("signOut")}
              </Button>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}
