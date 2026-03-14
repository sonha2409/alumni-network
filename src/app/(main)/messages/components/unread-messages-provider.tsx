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

interface UnreadMessagesContextValue {
  unreadCount: number;
  decrementUnread: (by?: number) => void;
  resetUnread: () => void;
}

const UnreadMessagesContext = createContext<UnreadMessagesContextValue | null>(
  null
);

export function useUnreadMessages() {
  const ctx = useContext(UnreadMessagesContext);
  if (!ctx) {
    throw new Error(
      "useUnreadMessages must be used within UnreadMessagesProvider"
    );
  }
  return ctx;
}

interface UnreadMessagesProviderProps {
  children: React.ReactNode;
  initialUnreadCount: number;
  currentUserId: string;
}

export function UnreadMessagesProvider({
  children,
  initialUnreadCount,
  currentUserId,
}: UnreadMessagesProviderProps) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);

  const decrementUnread = useCallback((by: number = 1) => {
    setUnreadCount((prev) => Math.max(0, prev - by));
  }, []);

  const resetUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`navbar-unread-messages:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload: { new: unknown }) => {
          const newMsg = payload.new as { sender_id: string };
          if (newMsg.sender_id !== currentUserId) {
            setUnreadCount((prev) => prev + 1);
          }
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
    <UnreadMessagesContext.Provider
      value={{
        unreadCount,
        decrementUnread,
        resetUnread,
      }}
    >
      {children}
    </UnreadMessagesContext.Provider>
  );
}
