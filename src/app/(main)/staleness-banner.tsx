import { createClient } from "@/lib/supabase/server";
import { getStalenessThresholdMonths } from "@/lib/queries/app-settings";
import { StalenessBannerClient } from "./staleness-banner-client";

export async function StalenessBanner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Check verification status — only show to verified users
  const { data: userData } = await supabase
    .from("users")
    .select("verification_status")
    .eq("id", user.id)
    .single();

  if (!userData || userData.verification_status !== "verified") return null;

  // Get the staleness threshold
  const thresholdMonths = await getStalenessThresholdMonths();
  if (thresholdMonths <= 0) return null; // Disabled by admin

  // Get the user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("updated_at, staleness_nudge_snoozed_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) return null; // No profile yet (onboarding)

  // Check if profile is stale
  const profileUpdatedAt = new Date(profile.updated_at);
  const staleDate = new Date();
  staleDate.setMonth(staleDate.getMonth() - thresholdMonths);

  if (profileUpdatedAt >= staleDate) return null; // Profile is fresh

  // Check snooze — 30-day cooldown
  if (profile.staleness_nudge_snoozed_at) {
    const snoozedAt = new Date(profile.staleness_nudge_snoozed_at);
    const snoozeExpiry = new Date(snoozedAt);
    snoozeExpiry.setDate(snoozeExpiry.getDate() + 30);

    if (new Date() < snoozeExpiry) return null; // Still snoozed
  }

  // Calculate how long ago the profile was updated
  const monthsAgo = Math.floor(
    (Date.now() - profileUpdatedAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  const timeAgoText =
    monthsAgo >= 12
      ? `${Math.floor(monthsAgo / 12)} year${Math.floor(monthsAgo / 12) > 1 ? "s" : ""}`
      : `${monthsAgo} month${monthsAgo > 1 ? "s" : ""}`;

  return <StalenessBannerClient timeAgoText={timeAgoText} />;
}
