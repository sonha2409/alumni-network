import { redirect } from "next/navigation";

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

  const currentYear = new Date().getFullYear();

  // Already verified
  if (status === "verified") {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Already Verified</CardTitle>
            <CardDescription>
              Your alumni status has been verified. You have full access to the platform.
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
            <CardTitle>Verification Under Review</CardTitle>
            <CardDescription>
              Your verification request was submitted on{" "}
              {new Date(latestRequest.created_at).toISOString().slice(0, 10)}. An admin
              will review it shortly.
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
              Previous Request Rejected
            </CardTitle>
            <CardDescription>
              {latestRequest.review_message
                ? `Reason: ${latestRequest.review_message}`
                : "Your previous verification request was not approved. You can submit a new request with updated information."}
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
