import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { BulkInviteClient } from "./bulk-invite-client";

export default async function AdminBulkInvitePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || userData.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Admin — Bulk Invite</h1>
        <p className="text-muted-foreground">
          Upload a CSV file to invite alumni to the platform.
        </p>
      </div>
      <BulkInviteClient />
    </div>
  );
}
