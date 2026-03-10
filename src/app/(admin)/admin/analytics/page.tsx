import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getAnalyticsData } from "./actions";
import { AnalyticsDashboard } from "./analytics-dashboard";

export default async function AnalyticsPage() {
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

  const data = await getAnalyticsData();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Platform Analytics</h1>
        <p className="text-muted-foreground">
          Usage statistics and trends across the platform.
        </p>
      </div>

      <AnalyticsDashboard data={data} />
    </div>
  );
}
