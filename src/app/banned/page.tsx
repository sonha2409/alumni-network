import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { BannedContent } from "./banned-content";

export default async function BannedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: userData } = await supabase
    .from("users")
    .select("is_active, suspended_until, ban_reason")
    .eq("id", user.id)
    .single();

  if (!userData) redirect("/login");

  const isBanned = !userData.is_active;
  const isSuspended =
    userData.suspended_until !== null &&
    new Date(userData.suspended_until) > new Date();

  // If user is not actually banned/suspended, redirect to dashboard
  if (!isBanned && !isSuspended) {
    redirect("/dashboard");
  }

  return (
    <BannedContent
      isBanned={isBanned}
      suspendedUntil={isSuspended ? userData.suspended_until : null}
      banReason={userData.ban_reason}
    />
  );
}
