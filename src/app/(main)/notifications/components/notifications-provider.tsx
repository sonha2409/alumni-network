"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/types";

interface NotificationsContextValue {
  unreadCount: number;
  recentNotifications: Notification[];
  decrementUnread: () => void;
  clearAllUnread: () => void;
  removeNotification: (id: string) => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null
);

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error(
      "useNotifications must be used within NotificationsProvider"
    );
  }
  return ctx;
}

interface NotificationsProviderProps {
  children: React.ReactNode;
  initialUnreadCount: number;
  initialNotifications: Notification[];
  currentUserId: string;
}

export function NotificationsProvider({
  children,
  initialUnreadCount,
  initialNotifications,
  currentUserId,
}: NotificationsProviderProps) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [recentNotifications, setRecentNotifications] =
    useState<Notification[]>(initialNotifications);
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);

  const decrementUnread = useCallback(() => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const clearAllUnread = useCallback(() => {
    setUnreadCount(0);
    setRecentNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true }))
    );
  }, []);

  const removeNotification = useCallback((id: string) => {
    setRecentNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Subscribe to new notifications for this user
    const channel = supabase
      .channel(`notifications:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setUnreadCount((prev) => prev + 1);
          setRecentNotifications((prev) => [newNotification, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [currentUserId]);

  return (
    <NotificationsContext.Provider
      value={{
        unreadCount,
        recentNotifications,
        decrementUnread,
        clearAllUnread,
        removeNotification,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
