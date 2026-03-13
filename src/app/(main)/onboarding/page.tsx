import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

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
import { getSchool } from "@/lib/school";
import { OnboardingForm } from "./onboarding-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false },
  };
}

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

  const [industries, school] = await Promise.all([
    getIndustriesWithSpecializations(),
    getSchool(),
  ]);

  const t = await getTranslations("onboarding");
  const currentYear = new Date().getFullYear();

  // Extract Google OAuth metadata for pre-filling the form
  const metadata = user.user_metadata ?? {};
  const defaultName = (metadata.full_name || metadata.name || "").trim() || undefined;
  const googleAvatarUrl = (metadata.avatar_url || metadata.picture || "").trim() || undefined;

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription>
            {t("subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm
            industries={industries}
            minGraduationYear={school.first_graduating_year}
            maxGraduationYear={currentYear + 3}
            defaultName={defaultName}
            googleAvatarUrl={googleAvatarUrl}
          />
        </CardContent>
      </Card>
    </div>
  );
}
