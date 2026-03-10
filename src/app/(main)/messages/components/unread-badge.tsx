"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface UnreadBadgeProps {
  initialCount: number;
  userId: string;
}

/**
 * Real-time unread message count badge for the navbar.
 * Subscribes to new messages and updates the count.
 */
export function UnreadBadge({ initialCount, userId }: UnreadBadgeProps) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`navbar-unread:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMsg = payload.new as { sender_id: string };
          if (newMsg.sender_id !== userId) {
            setCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (count <= 0) return null;

  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white animate-in zoom-in-50 duration-300">
      {count > 99 ? "99+" : count}
    </span>
  );
}
