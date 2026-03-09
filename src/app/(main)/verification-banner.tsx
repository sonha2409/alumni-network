import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { getUserVerificationStatus } from "@/lib/queries/verification";

export async function VerificationBanner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const status = await getUserVerificationStatus(user.id);

  if (!status || status === "verified") return null;

  if (status === "pending") {
    return (
      <div role="status" className="border-b border-yellow-300 bg-yellow-50 px-4 py-3 dark:border-yellow-700 dark:bg-yellow-950">
        <p className="text-center text-sm text-yellow-800 dark:text-yellow-200">
          Your verification is under review. You&apos;ll be notified once an admin reviews it.
        </p>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div role="alert" className="border-b border-red-300 bg-red-50 px-4 py-3 dark:border-red-700 dark:bg-red-950">
        <p className="text-center text-sm text-red-800 dark:text-red-200">
          Your verification request was not approved.{" "}
          <Link href="/verification" className="font-medium underline">
            Re-submit with updated information
          </Link>
        </p>
      </div>
    );
  }

  // unverified
  return (
    <div role="status" className="border-b border-blue-300 bg-blue-50 px-4 py-3 dark:border-blue-700 dark:bg-blue-950">
      <p className="text-center text-sm text-blue-800 dark:text-blue-200">
        Your account is unverified. Verify your alumni status to unlock full access.{" "}
        <Link href="/verification" className="font-medium underline">
          Verify now
        </Link>
      </p>
    </div>
  );
}
