import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ReportsClient } from "./components/reports-client";

export default async function ModerationReportsPage() {
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

  if (!userData || !["moderator", "admin"].includes(userData.role)) {
    redirect("/dashboard");
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Moderation — Reports</h1>
        <p className="text-muted-foreground">
          Review reported messages and take action.
        </p>
      </div>
      <ReportsClient role={userData.role as "moderator" | "admin"} />
    </div>
  );
}
