import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getPendingVerificationRequests } from "@/lib/queries/verification";
import { VerificationQueue } from "./verification-queue";

export default async function AdminVerificationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check admin role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || userData.role !== "admin") {
    redirect("/dashboard");
  }

  const requests = await getPendingVerificationRequests();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Admin — Verification</h1>
        <p className="text-muted-foreground">
          Review and approve alumni verification requests.
        </p>
      </div>
      <VerificationQueue requests={requests} />
    </div>
  );
}
