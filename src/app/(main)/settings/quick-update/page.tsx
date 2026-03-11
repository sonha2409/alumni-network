import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getAvailabilityTagTypes, getAvailabilityTagIdsByProfileId } from "@/lib/queries/availability-tags";
import { QuickUpdateForm } from "./quick-update-form";

export const dynamic = "force-dynamic";

export default async function QuickUpdatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get profile with current career entry
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, country, state_province, city")
    .eq("user_id", user.id)
    .single();

  if (!profile) redirect("/onboarding");

  // Get current career entry (is_current = true)
  const { data: currentCareer } = await supabase
    .from("career_entries")
    .select("id, job_title, company")
    .eq("profile_id", profile.id)
    .eq("is_current", true)
    .maybeSingle();

  // Get availability data
  const [tagTypes, selectedTagIds] = await Promise.all([
    getAvailabilityTagTypes(),
    getAvailabilityTagIdsByProfileId(profile.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Quick Profile Update</h2>
        <p className="text-sm text-muted-foreground">
          Confirm or update your key details. This keeps your profile fresh so
          other alumni can find you.
        </p>
      </div>

      <QuickUpdateForm
        profileId={profile.id}
        currentCareer={currentCareer}
        country={profile.country}
        stateProvince={profile.state_province}
        city={profile.city}
        tagTypes={tagTypes}
        selectedTagIds={selectedTagIds}
      />
    </div>
  );
}
