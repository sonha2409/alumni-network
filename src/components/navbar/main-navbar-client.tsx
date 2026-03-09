"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/app/(auth)/actions";
import type { NavbarUserData } from "./main-navbar";

interface MainNavbarClientProps {
  user: NavbarUserData;
}

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/directory", label: "Directory" },
  { href: "/verification", label: "Verification" },
];

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

export function MainNavbarClient({ user }: MainNavbarClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const profileHref = user.profileId
    ? `/profile/${user.profileId}`
    : "/onboarding";

  const isAdmin = user.role === "admin";

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
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin/verification"
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Admin
            </Link>
          )}
        </div>

        {/* Desktop user menu */}
        <div className="hidden items-center gap-2 md:flex">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-2 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="User menu"
            >
              <UserAvatar user={user} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">
                  {user.fullName ?? "Welcome"}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                render={<Link href={profileHref} />}
              >
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                render={<Link href="/profile/edit" />}
              >
                Edit Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  const form = document.getElementById("navbar-logout-form") as HTMLFormElement;
                  form?.requestSubmit();
                }}
              >
                Sign out
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
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
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
                className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={profileHref}
              className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              My Profile
            </Link>
            {isAdmin && (
              <Link
                href="/admin/verification"
                className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Admin
              </Link>
            )}
          </div>
          <div className="border-t px-4 py-3">
            <div className="flex items-center gap-3 px-3 pb-3">
              <UserAvatar user={user} />
              <div>
                <p className="text-sm font-medium">
                  {user.fullName ?? "Welcome"}
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
                Sign out
              </Button>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}
