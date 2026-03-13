"use client";

import { useCallback, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useNotifications } from "./notifications-provider";
import { NotificationItem } from "./notification-item";
import {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  fetchNotificationsPage,
} from "../actions";
import type { Notification } from "@/lib/types";

interface NotificationsPageClientProps {
  initialNotifications: Notification[];
  initialTotalCount: number;
}

export function NotificationsPageClient({
  initialNotifications,
  initialTotalCount,
}: NotificationsPageClientProps) {
  const tc = useTranslations("common");
  const [notifications, setNotifications] =
    useState<Notification[]>(initialNotifications);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const { decrementUnread, clearAllUnread, removeNotification } =
    useNotifications();

  const pageSize = 20;
  const totalPages = Math.ceil(totalCount / pageSize);

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  const handleMarkRead = useCallback(
    async (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      decrementUnread();
      await markNotificationRead(id);
    },
    [decrementUnread]
  );

  const handleMarkAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    clearAllUnread();
    await markAllNotificationsRead();
  }, [clearAllUnread]);

  const handleDelete = useCallback(
    async (id: string) => {
      const notification = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotalCount((prev) => prev - 1);
      removeNotification(id);
      if (notification && !notification.is_read) {
        decrementUnread();
      }
      await deleteNotification(id);
    },
    [notifications, removeNotification, decrementUnread]
  );

  const loadPage = useCallback(
    (newPage: number) => {
      startTransition(async () => {
        const result = await fetchNotificationsPage(
          newPage,
          pageSize,
          filter === "unread"
        );
        if (result.success) {
          setNotifications(result.data.data);
          setTotalCount(result.data.totalCount);
          setPage(newPage);
        }
      });
    },
    [filter]
  );

  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <div className="space-y-4">
      {/* Filter tabs + actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            {tc("all")}
          </Button>
          <Button
            variant={filter === "unread" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("unread")}
          >
            Unread
          </Button>
        </div>
        {hasUnread && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notification list */}
      <div className="overflow-hidden rounded-lg border">
        {filteredNotifications.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            {filter === "unread"
              ? "No unread notifications"
              : "No notifications yet"}
          </div>
        ) : (
          <div className="divide-y">
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={handleMarkRead}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isPending}
            onClick={() => loadPage(page - 1)}
          >
            {tc("previous")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {tc("page", { page, totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || isPending}
            onClick={() => loadPage(page + 1)}
          >
            {tc("next")}
          </Button>
        </div>
      )}
    </div>
  );
}
