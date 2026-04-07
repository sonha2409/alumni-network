"use client";

import { useCallback } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications } from "@/app/(main)/notifications/components/notifications-provider";
import { NotificationItem } from "@/app/(main)/notifications/components/notification-item";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/app/(main)/notifications/actions";

export function NotificationBell() {
  const {
    unreadCount,
    recentNotifications,
    decrementUnread,
    clearAllUnread,
  } = useNotifications();

  const handleMarkRead = useCallback(
    async (id: string) => {
      decrementUnread();
      await markNotificationRead(id);
    },
    [decrementUnread]
  );

  const handleMarkAllRead = useCallback(async () => {
    clearAllUnread();
    await markAllNotificationsRead();
  }, [clearAllUnread]);

  return (
    <Popover>
      <PopoverTrigger
        className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="size-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white animate-in zoom-in-50 duration-300">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 gap-0 p-0 sm:w-96"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-primary hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {recentNotifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y">
              {recentNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                  compact
                />
              ))}
            </div>
          )}
        </div>
        <div className="border-t px-4 py-2">
          <Link
            href="/notifications"
            className="block text-center text-xs font-medium text-primary hover:underline"
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
