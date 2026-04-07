"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * F45: PresenceAnnouncer
 *
 * Mounted once per authenticated session in the main app layout. Joins a
 * Supabase Realtime presence channel keyed by the current user's id and
 * tracks their online state. Any `<LastSeenIndicator>` observing this same
 * user id will see them as "online" for as long as this component is mounted.
 *
 * Design notes:
 *   - Per-user channel (`user-presence:${userId}`), not a global "who's
 *     online" channel. Scales with profile views, not users².
 *   - We only *track* presence here; we don't listen for sync events. The
 *     observer side lives in <LastSeenIndicator>.
 *   - Unsubscribes on unmount (navigating to a non-main route or signing out
 *     tears down the channel). The server-side `last_active_at` value —
 *     updated via the `touch_last_seen` RPC in proxy.ts — takes over once
 *     presence drops, so the "Active now" → "Active 1m ago" handoff is
 *     seamless without any extra writes from this component.
 */
interface PresenceAnnouncerProps {
  userId: string;
}

export function PresenceAnnouncer({ userId }: PresenceAnnouncerProps) {
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase.channel(`user-presence:${userId}`, {
      config: { presence: { key: userId } },
    });

    channel.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        void channel.track({ online_at: new Date().toISOString() });
      }
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return null;
}
