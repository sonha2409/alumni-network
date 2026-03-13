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
import { getCareerEntriesByProfileId } from "@/lib/queries/career-entries";
import { getEducationEntriesByProfileId } from "@/lib/queries/education-entries";
import {
  getAvailabilityTagTypes,
  getAvailabilityTagIdsByProfileId,
} from "@/lib/queries/availability-tags";
import { getContactDetailsByProfileId } from "@/lib/queries/contact-details";
import { ProfileEditForm } from "./profile-edit-form";
import { CareerHistorySection } from "./career-history-section";
import { EducationHistorySection } from "./education-history-section";
import { AvailabilityTagsSection } from "./availability-tags-section";
import { ContactDetailsSection } from "./contact-details-section";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile");
  return {
    title: t("editTitle"),
    description: t("editDescription"),
    robots: { index: false },
  };
}

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

  const [industries, careerEntries, educationEntries, tagTypes, selectedTagIds, school, contactDetails] =
    await Promise.all([
      getIndustriesWithSpecializations(),
      getCareerEntriesByProfileId(profile.id),
      getEducationEntriesByProfileId(profile.id),
      getAvailabilityTagTypes(),
      getAvailabilityTagIdsByProfileId(profile.id),
      getSchool(),
      getContactDetailsByProfileId(profile.id),
    ]);

  const t = await getTranslations("profile");
  const currentYear = new Date().getFullYear();

  return (
    <div className="mx-auto max-w-2xl flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t("editProfile")}</CardTitle>
          <CardDescription>
            {t("editSubtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileEditForm
            profile={profile}
            industries={industries}
            minGraduationYear={school.first_graduating_year}
            maxGraduationYear={currentYear + 3}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <CareerHistorySection
            entries={careerEntries}
            industries={industries}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <EducationHistorySection entries={educationEntries} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <AvailabilityTagsSection
            tagTypes={tagTypes}
            selectedTagIds={selectedTagIds}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <ContactDetailsSection contactDetails={contactDetails} />
        </CardContent>
      </Card>
    </div>
  );
}
