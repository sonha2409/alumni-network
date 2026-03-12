"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

interface AdminNavbarProps {
  role: "moderator" | "admin";
}

const linkClass =
  "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground whitespace-nowrap";

export function AdminNavbar({ role }: AdminNavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="border-b bg-background" aria-label="Admin navigation">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo + desktop links */}
        <div className="flex items-center gap-4 min-w-0">
          <span className="flex-shrink-0 text-lg font-bold tracking-tight">
            AlumNet{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {role === "admin" ? "Admin" : "Moderation"}
            </span>
          </span>

          {/* Desktop nav links — hidden on mobile */}
          <div className="hidden items-center gap-1 md:flex">
            <Link href="/moderation/reports" className={linkClass}>
              Reports
            </Link>
            {role === "admin" && (
              <>
                <Link href="/admin/verification" className={linkClass}>
                  Verification
                </Link>
                <Link href="/admin/users" className={linkClass}>
                  Users
                </Link>
                <Link href="/admin/taxonomy" className={linkClass}>
                  Taxonomy
                </Link>
                <Link href="/admin/analytics" className={linkClass}>
                  Analytics
                </Link>
                <Link href="/admin/map" className={linkClass}>
                  Map
                </Link>
                <Link href="/admin/bulk-invite" className={linkClass}>
                  Invite
                </Link>
                <Link href="/admin/announcements" className={linkClass}>
                  Announcements
                </Link>
                <Link href="/admin/settings" className={linkClass}>
                  Settings
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Right side: back link (desktop) + hamburger (mobile) */}
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className={linkClass + " hidden sm:inline-flex"}>
            &larr; Back to App
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
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
              Reports
            </Link>
            {role === "admin" && (
              <>
                <Link
                  href="/admin/verification"
                  className={linkClass}
                  onClick={() => setMobileOpen(false)}
                >
                  Verification
                </Link>
                <Link
                  href="/admin/users"
                  className={linkClass}
                  onClick={() => setMobileOpen(false)}
                >
                  Users
                </Link>
                <Link
                  href="/admin/taxonomy"
                  className={linkClass}
                  onClick={() => setMobileOpen(false)}
                >
                  Taxonomy
                </Link>
                <Link
                  href="/admin/analytics"
                  className={linkClass}
                  onClick={() => setMobileOpen(false)}
                >
                  Analytics
                </Link>
                <Link
                  href="/admin/map"
                  className={linkClass}
                  onClick={() => setMobileOpen(false)}
                >
                  Map
                </Link>
                <Link
                  href="/admin/bulk-invite"
                  className={linkClass}
                  onClick={() => setMobileOpen(false)}
                >
                  Invite
                </Link>
                <Link
                  href="/admin/announcements"
                  className={linkClass}
                  onClick={() => setMobileOpen(false)}
                >
                  Announcements
                </Link>
                <Link
                  href="/admin/settings"
                  className={linkClass}
                  onClick={() => setMobileOpen(false)}
                >
                  Settings
                </Link>
              </>
            )}
            <hr className="my-1 border-border" />
            <Link
              href="/dashboard"
              className={linkClass}
              onClick={() => setMobileOpen(false)}
            >
              &larr; Back to App
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
