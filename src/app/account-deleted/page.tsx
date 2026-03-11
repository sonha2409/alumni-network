import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AccountDeletedContent } from "./account-deleted-content";

export const dynamic = "force-dynamic";

export default async function AccountDeletedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: userData } = await supabase
    .from("users")
    .select("is_active, deleted_at, deletion_requested_at")
    .eq("id", user.id)
    .single();

  if (!userData) redirect("/login");

  // If user is active (not deleted), redirect to dashboard
  if (userData.is_active) {
    redirect("/dashboard");
  }

  // If user is banned (no deleted_at), redirect to banned page
  if (!userData.deleted_at) {
    redirect("/banned");
  }

  const deletedAt = new Date(userData.deleted_at);
  const gracePeriodEnd = new Date(
    deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000
  );
  const now = new Date();
  const daysRemaining = Math.max(
    0,
    Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );
  const isExpired = daysRemaining === 0;

  return (
    <AccountDeletedContent
      daysRemaining={daysRemaining}
      isExpired={isExpired}
      deletedAt={userData.deleted_at}
    />
  );
}
