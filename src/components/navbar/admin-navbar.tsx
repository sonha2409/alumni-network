import Link from "next/link";

interface AdminNavbarProps {
  role: "moderator" | "admin";
}

const linkClass =
  "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

export function AdminNavbar({ role }: AdminNavbarProps) {
  return (
    <nav className="border-b bg-background" aria-label="Admin navigation">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <span className="text-lg font-bold tracking-tight">
            AlumNet{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {role === "admin" ? "Admin" : "Moderation"}
            </span>
          </span>
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
            </>
          )}
        </div>
        <Link href="/dashboard" className={linkClass}>
          &larr; Back to App
        </Link>
      </div>
    </nav>
  );
}
