import { createClient } from "@/lib/supabase/server";
import {
  getUnreadNotificationCount,
  getRecentNotifications,
} from "@/lib/queries/notifications";
import { getTotalUnreadCount } from "@/lib/queries/messages";
import { NotificationsProvider } from "./notifications/components/notifications-provider";
import { UnreadMessagesProvider } from "./messages/components/unread-messages-provider";

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

  const [unreadCount, recentNotifications, unreadMessageCount] =
    await Promise.all([
      getUnreadNotificationCount(user.id),
      getRecentNotifications(user.id),
      getTotalUnreadCount(user.id),
    ]);

  return (
    <NotificationsProvider
      initialUnreadCount={unreadCount}
      initialNotifications={recentNotifications}
      currentUserId={user.id}
    >
      <UnreadMessagesProvider
        initialUnreadCount={unreadMessageCount}
        currentUserId={user.id}
      >
        {children}
      </UnreadMessagesProvider>
    </NotificationsProvider>
  );
}
