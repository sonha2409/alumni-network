import Link from "next/link";

export function AdminNavbar() {
  return (
    <nav className="border-b bg-background" aria-label="Admin navigation">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <span className="text-lg font-bold tracking-tight">
            AlumNet{" "}
            <span className="text-sm font-normal text-muted-foreground">
              Admin
            </span>
          </span>
          <Link
            href="/admin/verification"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Verification Queue
          </Link>
        </div>
        <Link
          href="/dashboard"
          className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          &larr; Back to App
        </Link>
      </div>
    </nav>
  );
}
