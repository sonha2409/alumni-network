import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/queries/profiles";
import { QuizForm } from "./quiz-form";

export const metadata: Metadata = {
  title: "Quick Setup — PTNKAlum",
  description: "Answer a few quick questions to get better alumni recommendations.",
  robots: { index: false },
};

export default async function OnboardingQuizPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Must have a profile to take the quiz
  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    redirect("/onboarding");
  }

  // Skip quiz if user has already filled in quiz-specific fields
  // (location or availability tags already set)
  const hasLocation = profile.country || profile.state_province || profile.city;

  const { count: tagCount } = await supabase
    .from("user_availability_tags")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id);

  if (hasLocation && (tagCount ?? 0) > 0) {
    redirect("/dashboard");
  }

  // Fetch availability tag types
  const { data: availabilityTags } = await supabase
    .from("availability_tag_types")
    .select("*")
    .eq("is_archived", false)
    .order("sort_order");

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Quick setup</CardTitle>
          <CardDescription>
            A few more details to help us find the right alumni for you.
            Everything is optional — you can always update later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QuizForm availabilityTags={availabilityTags ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
