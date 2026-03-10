import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/queries/notifications";
import { NotificationsPageClient } from "./components/notifications-page-client";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: notifications, totalCount } = await getNotifications(
    user.id,
    1,
    20
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
      <NotificationsPageClient
        initialNotifications={notifications}
        initialTotalCount={totalCount}
      />
    </div>
  );
}
