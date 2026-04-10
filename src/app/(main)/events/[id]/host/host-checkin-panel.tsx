"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { generateCheckinToken, getCheckins } from "./actions";
import type { CheckinAttendee } from "./actions";

interface Props {
  eventId: string;
  goingCount: number;
  initialCheckins: CheckinAttendee[];
  initialTotal: number;
}

const ROTATE_INTERVAL_MS = 60_000; // 60 seconds

export function HostCheckinPanel({
  eventId,
  goingCount,
  initialCheckins,
  initialTotal,
}: Props) {
  const [checkinUrl, setCheckinUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [checkins, setCheckins] = useState<CheckinAttendee[]>(initialCheckins);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ------- Token generation -------
  const refreshToken = useCallback(async () => {
    const result = await generateCheckinToken(eventId);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setCheckinUrl(result.data.checkinUrl);
    setExpiresAt(result.data.expiresAt);
    setError(null);
  }, [eventId]);

  // Initial token + rotation
  useEffect(() => {
    refreshToken();
    const interval = setInterval(refreshToken, ROTATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshToken]);

  // Countdown timer
  useEffect(() => {
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      setSecondsLeft(Math.max(0, expiresAt - now));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // ------- Realtime subscription for new checkins -------
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`event-checkins:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "event_checkins",
          filter: `event_id=eq.${eventId}`,
        },
        async () => {
          // Re-fetch full list to get profile data
          const result = await getCheckins(eventId);
          if (result.success) {
            setCheckins(result.data.checkins);
            setTotal(result.data.total);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // ------- Filtered list -------
  const filtered = search
    ? checkins.filter((c) =>
        c.fullName.toLowerCase().includes(search.toLowerCase())
      )
    : checkins;

  return (
    <div className="flex flex-col gap-6">
      {/* QR Code */}
      <section className="flex flex-col items-center gap-4 rounded-xl border bg-card p-6">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : checkinUrl ? (
          <>
            <div className="rounded-lg bg-white p-4">
              <QRCodeSVG value={checkinUrl} size={240} level="M" />
            </div>
            <p className="text-sm text-muted-foreground">
              Scan to check in &middot; Refreshes in{" "}
              <span className="font-mono font-medium tabular-nums">
                {secondsLeft}s
              </span>
            </p>
          </>
        ) : (
          <div className="flex h-[240px] w-[240px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-3xl font-bold tabular-nums">{total}</p>
          <p className="text-xs text-muted-foreground">Checked in</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-3xl font-bold tabular-nums">{goingCount}</p>
          <p className="text-xs text-muted-foreground">RSVP&apos;d Going</p>
        </div>
      </section>

      {/* Attendee list */}
      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
          Checked-in attendees
        </h2>

        {checkins.length > 5 && (
          <Input
            placeholder="Search attendees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3"
          />
        )}

        {filtered.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {checkins.length === 0
              ? "No one has checked in yet."
              : "No matches found."}
          </p>
        ) : (
          <ul className="divide-y">
            {filtered.map((c) => (
              <li
                key={c.userId}
                className="flex items-center gap-3 py-2.5"
              >
                {c.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.avatarUrl}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {c.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{c.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(c.checkedInAt).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
