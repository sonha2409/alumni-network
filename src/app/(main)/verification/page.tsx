import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { getLatestVerificationRequest, getUserVerificationStatus } from "@/lib/queries/verification";
import { getProfileByUserId } from "@/lib/queries/profiles";
import { getSchool } from "@/lib/school";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VerificationForm } from "./verification-form";

export default async function VerificationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [status, latestRequest, profile, school] = await Promise.all([
    getUserVerificationStatus(user.id),
    getLatestVerificationRequest(user.id),
    getProfileByUserId(user.id),
    getSchool(),
  ]);

  const t = await getTranslations("verification");
  const currentYear = new Date().getFullYear();

  // Already verified
  if (status === "verified") {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>{t("alreadyVerified")}</CardTitle>
            <CardDescription>
              {t("alreadyVerifiedDesc")}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Pending review
  if (status === "pending" && latestRequest) {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>{t("underReview")}</CardTitle>
            <CardDescription>
              {t("underReviewDesc", { date: new Date(latestRequest.created_at).toISOString().slice(0, 10) })}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Rejected — show message and allow re-submission
  const showRejectionMessage = status === "rejected" && latestRequest?.status === "rejected";

  return (
    <div className="mx-auto max-w-lg">
      {showRejectionMessage && (
        <Card className="mb-4 border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">
              {t("previousRejected")}
            </CardTitle>
            <CardDescription>
              {latestRequest.review_message
                ? t("rejectedReason", { reason: latestRequest.review_message })
                : t("rejectedDefault")}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      <VerificationForm
        defaultGraduationYear={profile?.graduation_year ?? currentYear}
        minGraduationYear={school.first_graduating_year}
        maxGraduationYear={currentYear + 3}
        schoolType={school.school_type}
      />
    </div>
  );
}
