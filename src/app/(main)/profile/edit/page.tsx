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
import { ProfileEditForm } from "./profile-edit-form";

export const metadata: Metadata = {
  title: "Edit Profile — AlumNet",
  description: "Update your alumni profile.",
  robots: { index: false },
};

export default async function ProfileEditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    redirect("/onboarding");
  }

  const industries = await getIndustriesWithSpecializations();

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Edit profile</CardTitle>
          <CardDescription>
            Keep your profile up to date so alumni can find and connect with you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileEditForm profile={profile} industries={industries} />
        </CardContent>
      </Card>
    </div>
  );
}
