import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          AlumNet
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Connect with fellow alumni by career, location, and shared interests.
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/signup"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          Get Started
        </Link>
        <Link
          href="/login"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          Log In
        </Link>
      </div>
    </div>
  );
}
