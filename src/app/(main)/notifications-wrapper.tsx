import { createClient } from "@/lib/supabase/server";
import {
  getUnreadNotificationCount,
  getRecentNotifications,
} from "@/lib/queries/notifications";
import { NotificationsProvider } from "./notifications/components/notifications-provider";

export async function NotificationsWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <>{children}</>;
  }

  const [unreadCount, recentNotifications] = await Promise.all([
    getUnreadNotificationCount(user.id),
    getRecentNotifications(user.id),
  ]);

  return (
    <NotificationsProvider
      initialUnreadCount={unreadCount}
      initialNotifications={recentNotifications}
      currentUserId={user.id}
    >
      {children}
    </NotificationsProvider>
  );
}
