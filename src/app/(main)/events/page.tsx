import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import type { EventRow } from "@/lib/types";

export const metadata = {
  title: "Events",
  description: "Upcoming and past alumni events",
};

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function EventsPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("users")
    .select("verification_status")
    .eq("id", user.id)
    .single();
  const isVerified = me?.verification_status === "verified";

  const raw = await searchParams;
  const tab = raw.tab === "past" ? "past" : "upcoming";
  const q =
    typeof raw.q === "string" && raw.q.trim() ? raw.q.trim() : undefined;

  const nowIso = new Date().toISOString();
  let query = supabase
    .from("events")
    .select("*")
    .is("deleted_at", null)
    .order("start_time", { ascending: tab === "upcoming" });

  query =
    tab === "upcoming"
      ? query.gte("end_time", nowIso)
      : query.lt("end_time", nowIso);

  if (q) query = query.ilike("title", `%${q}%`);

  const { data: events } = await query.limit(50);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Discover and RSVP to alumni events.
          </p>
        </div>
        {isVerified && (
          <Link
            href="/events/new"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create event
          </Link>
        )}
      </div>

      {!isVerified && (
        <div className="rounded-xl border border-primary/15 bg-primary/[0.03] px-4 py-3 text-center text-sm text-muted-foreground">
          <Link
            href="/verification"
            className="font-medium text-primary underline underline-offset-4"
          >
            Verify your account to create events and RSVP
          </Link>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <Link
          href="/events?tab=upcoming"
          className={`px-4 py-2 text-sm font-medium ${
            tab === "upcoming"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground"
          }`}
        >
          Upcoming
        </Link>
        <Link
          href="/events?tab=past"
          className={`px-4 py-2 text-sm font-medium ${
            tab === "past"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground"
          }`}
        >
          Past
        </Link>
      </div>

      {/* Search */}
      <form className="flex gap-2" action="/events" method="get">
        <input type="hidden" name="tab" value={tab} />
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by title…"
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Search
        </button>
      </form>

      {/* Grid */}
      {events && events.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(events as EventRow[]).map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          No {tab} events found.
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: EventRow }) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card transition hover:border-primary/40"
    >
      {event.cover_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.cover_image_url}
          alt=""
          className="h-36 w-full object-cover"
        />
      ) : (
        <div className="h-36 w-full bg-gradient-to-br from-primary/20 to-accent/20" />
      )}
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-center gap-2">
          <h3 className="line-clamp-2 font-semibold group-hover:text-primary">
            {event.title}
          </h3>
          {event.series_id && (
            <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              Recurring
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(event.start_time).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
        {event.address && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {event.address}
          </p>
        )}
      </div>
    </Link>
  );
}
