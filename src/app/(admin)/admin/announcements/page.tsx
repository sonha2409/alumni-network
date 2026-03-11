import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AnnouncementsClient } from "./announcements-client";

export default async function AdminAnnouncementsPage() {
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
        <h1 className="text-2xl font-bold">Admin — Announcements</h1>
        <p className="text-muted-foreground">
          Create and manage platform-wide notices for all users.
        </p>
      </div>
      <AnnouncementsClient />
    </div>
  );
}
