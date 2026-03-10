import Link from "next/link";
import { Button } from "@/components/ui/button";

interface RestrictedSectionProps {
  /** "verify" for Tier 1 viewers, "connect" for Tier 2 viewers missing contact details */
  variant: "verify" | "connect";
  targetName?: string;
}

export function RestrictedSection({ variant, targetName }: RestrictedSectionProps) {
  if (variant === "verify") {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Verify your alumni status to see full profiles.
        </p>
        <Link href="/verification">
          <Button variant="outline" size="sm" className="mt-3">
            Start verification
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/30 p-6 text-center">
      <p className="text-sm text-muted-foreground">
        Connect with {targetName ?? "this person"} to see their contact info.
      </p>
    </div>
  );
}
