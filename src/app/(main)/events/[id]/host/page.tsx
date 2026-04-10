import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { HostCheckinPanel } from "./host-checkin-panel";
import { getCheckins } from "./actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function HostCheckinPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify host access
  const { data: isHost } = await supabase.rpc("is_event_host", {
    p_event_id: id,
    p_user_id: user.id,
  });
  if (!isHost) notFound();

  // Fetch event details for display
  const { data: event } = await supabase
    .from("events")
    .select("id, title, start_time, end_time, event_timezone, deleted_at")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!event) notFound();

  // Check time window
  const now = new Date();
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);
  const windowStart = new Date(start.getTime() - 2 * 60 * 60 * 1000);
  const windowEnd = new Date(end.getTime() + 2 * 60 * 60 * 1000);
  const withinWindow = now >= windowStart && now <= windowEnd;

  // Going count
  const { data: goingCount } = await supabase.rpc("get_event_going_count", {
    p_event_id: id,
  });

  // Initial checkins
  const checkinsResult = await getCheckins(id);
  const initialCheckins =
    checkinsResult.success ? checkinsResult.data.checkins : [];
  const initialTotal =
    checkinsResult.success ? checkinsResult.data.total : 0;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 py-4">
      <div className="flex items-center gap-2">
        <Link
          href={`/events/${id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to event
        </Link>
      </div>

      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">{event.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Check-in</p>
      </header>

      {!withinWindow ? (
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Check-in is available from 2 hours before the event starts until 2
            hours after it ends.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Event starts:{" "}
            {new Intl.DateTimeFormat(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: event.event_timezone,
            }).format(start)}
          </p>
        </div>
      ) : (
        <HostCheckinPanel
          eventId={id}
          goingCount={goingCount ?? 0}
          initialCheckins={initialCheckins}
          initialTotal={initialTotal}
        />
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";
