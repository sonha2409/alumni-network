import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/queries/profiles";
import { getIndustriesWithSpecializations } from "@/lib/queries/taxonomy";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = {
  title: "Complete Your Profile — AlumNet",
  description: "Set up your alumni profile to connect with your network.",
  robots: { index: false },
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // If profile already exists, skip onboarding
  const profile = await getProfileByUserId(user.id);
  if (profile) {
    redirect("/dashboard");
  }

  const industries = await getIndustriesWithSpecializations();

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to AlumNet</CardTitle>
          <CardDescription>
            Let&apos;s set up your profile. You can always add more details
            later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm industries={industries} />
        </CardContent>
      </Card>
    </div>
  );
}
