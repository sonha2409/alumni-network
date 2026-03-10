import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/queries/profiles";
import { getRecommendedAlumni } from "@/lib/queries/recommendations";
import { getConnectionStatusMap } from "@/lib/queries/connections";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getProfileByUserId(user.id);

  // If no profile, recommendations can't be computed — show empty state
  if (!profile) {
    return (
      <DashboardClient
        userName={user.email?.split("@")[0] ?? "there"}
        hasProfile={false}
        recommendations={[]}
        connectionStatuses={{}}
        profileCompleteness={0}
      />
    );
  }

  // Fetch recommendations and connection statuses in parallel
  const recommendations = await getRecommendedAlumni(user.id, 20);
  const userIds = recommendations.map((r) => r.user_id);
  const statusMap = await getConnectionStatusMap(user.id, userIds);

  // Convert Map to plain object for client component serialization
  const connectionStatuses: Record<
    string,
    "connected" | "pending_sent" | "pending_received"
  > = {};
  statusMap.forEach((status, id) => {
    connectionStatuses[id] = status;
  });

  return (
    <DashboardClient
      userName={profile.full_name.split(" ")[0]}
      hasProfile={true}
      recommendations={recommendations}
      connectionStatuses={connectionStatuses}
      profileCompleteness={profile.profile_completeness}
    />
  );
}
