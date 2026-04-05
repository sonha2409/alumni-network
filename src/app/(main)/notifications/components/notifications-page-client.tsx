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
        <div className="flex gap-1 rounded-lg bg-muted/70 p-1">
          <button
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
              filter === "all"
                ? "bg-background text-primary shadow-sm ring-1 ring-primary/10"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setFilter("all")}
          >
            {tc("all")}
          </button>
          <button
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
              filter === "unread"
                ? "bg-background text-primary shadow-sm ring-1 ring-primary/10"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setFilter("unread")}
          >
            Unread
          </button>
        </div>
        {hasUnread && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="text-primary hover:bg-primary/5 hover:text-primary">
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notification list */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        {filteredNotifications.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
              <svg className="h-5 w-5 text-primary/50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">
              {filter === "unread"
                ? "No unread notifications"
                : "No notifications yet"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
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
