"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

/**
 * F45: LastSeenIndicator
 *
 * Client component rendered in the profile header AND the chat header.
 * Responsible for:
 *   1. Observing the target user's presence channel and flipping to
 *      "Active now" + green dot while they have an open session.
 *   2. Rendering a locale-aware relative timestamp ("Active 5 minutes ago")
 *      when the target is offline. Re-renders every 60s so the label stays
 *      fresh.
 *
 * Two ways to obtain the initial offline timestamp:
 *   - Server-prefetch: pass `initialLastSeen` directly (used by the profile
 *     page, which already runs `getLastSeenFor()` server-side).
 *   - Client-fetch: omit `initialLastSeen` and the component will call the
 *     `get_last_seen` RPC on mount (used by the chat header, which lives
 *     inside a client component). The RPC is SECURITY DEFINER and gates on
 *     `auth.uid()` server-side, so it's safe to call from the browser.
 *
 * Gate respect:
 *   - When the gate fails the server returns `null`. In both modes the
 *     component renders nothing AND never joins the presence channel — the
 *     green dot cannot leak past the gate.
 */
interface LastSeenIndicatorProps {
  targetUserId: string;
  initialLastSeen?: string | null;
}

function formatRelative(iso: string, locale: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.round((now - then) / 1000));

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (diffSec < 60) return rtf.format(-diffSec, "second");
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return rtf.format(-diffMin, "minute");
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return rtf.format(-diffHour, "hour");
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 30) return rtf.format(-diffDay, "day");
  const diffMonth = Math.round(diffDay / 30);
  if (diffMonth < 12) return rtf.format(-diffMonth, "month");
  const diffYear = Math.round(diffDay / 365);
  return rtf.format(-diffYear, "year");
}

export function LastSeenIndicator({
  targetUserId,
  initialLastSeen,
}: LastSeenIndicatorProps) {
  const t = useTranslations("presence");
  const locale = useLocale();

  // Three states for the gated value:
  //   - undefined: client-fetch in flight (we don't yet know if the gate passes)
  //   - null:      gate failed (render nothing)
  //   - string:    ISO timestamp from the server
  const [lastSeen, setLastSeen] = useState<string | null | undefined>(
    initialLastSeen
  );
  const [isOnline, setIsOnline] = useState(false);
  // Tick every 60s to keep the relative-time label fresh while the component
  // stays mounted (e.g. user leaves the profile tab open).
  const [, setTick] = useState(0);

  // Client-fetch path: if no server-prefetched value was provided, call the
  // SECURITY DEFINER RPC ourselves. The RPC enforces the visibility gate.
  useEffect(() => {
    if (initialLastSeen !== undefined) {
      setLastSeen(initialLastSeen);
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    void supabase
      .rpc("get_last_seen", { p_target: targetUserId })
      .then((result: { data: unknown; error: { message: string } | null }) => {
        if (cancelled) return;
        if (result.error) {
          console.error("[LastSeenIndicator]", { error: result.error.message });
          setLastSeen(null);
          return;
        }
        setLastSeen((result.data as string | null) ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [initialLastSeen, targetUserId]);

  const gateOpen = lastSeen !== null && lastSeen !== undefined;

  useEffect(() => {
    if (!gateOpen) return;

    const supabase = createClient();
    const channel = supabase.channel(`user-presence:${targetUserId}`);

    const refresh = () => {
      const state = channel.presenceState();
      // Any tracked client under any key counts as "online".
      const hasAnyone = Object.values(state).some(
        (entries) => Array.isArray(entries) && entries.length > 0
      );
      setIsOnline(hasAnyone);
    };

    channel
      .on("presence", { event: "sync" }, refresh)
      .on("presence", { event: "join" }, refresh)
      .on("presence", { event: "leave" }, refresh)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [gateOpen, targetUserId]);

  useEffect(() => {
    if (!gateOpen || isOnline) return;
    const interval = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(interval);
  }, [gateOpen, isOnline]);

  const offlineLabel = useMemo(() => {
    if (!lastSeen) return null;
    return formatRelative(lastSeen, locale);
  }, [lastSeen, locale]);

  if (!gateOpen) return null;

  if (isOnline) {
    return (
      <p
        className="mt-1 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"
        aria-live="polite"
      >
        <span className="inline-block size-2 rounded-full bg-emerald-500" />
        {t("activeNow")}
      </p>
    );
  }

  return (
    <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">
      {offlineLabel}
    </p>
  );
}
