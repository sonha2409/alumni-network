import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import type { EventRow } from "@/lib/types";
import { RsvpControls } from "./rsvp-controls";
import { HostActions } from "./host-actions";
import { BulkInviteButton } from "./bulk-invite-button";
import { EventComments } from "./comments/event-comments";
import { getEventComments } from "./comments/actions";
import { SeriesNav } from "./series-nav";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ptnkalum.com";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("title, description, start_time, end_time, address, location_type, is_public")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!event) return { title: "Event not found" };

  const dateStr = new Date(event.start_time).toLocaleDateString("en-US", {
    dateStyle: "medium",
  });
  const title = event.title;
  const description =
    event.description?.slice(0, 155) ||
    `${event.title} — ${dateStr}${event.address ? ` at ${event.address}` : ""}`;

  return {
    title,
    description,
    alternates: { canonical: `/events/${id}` },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/events/${id}`,
      type: "website",
    },
    twitter: { title, description },
  };
}

function formatRange(start: string, end: string, tz: string) {
  const fmt = new Intl.DateTimeFormat(undefined, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: tz,
  });
  return `${fmt.format(new Date(start))} — ${fmt.format(new Date(end))}`;
}

function buildEventJsonLd(e: EventRow) {
  const location =
    e.location_type === "virtual"
      ? { "@type": "VirtualLocation" as const, url: e.virtual_url ?? siteUrl }
      : e.location_type === "physical"
        ? { "@type": "Place" as const, name: e.address ?? "TBA", address: e.address ?? "TBA" }
        : [
            { "@type": "Place" as const, name: e.address ?? "TBA", address: e.address ?? "TBA" },
            { "@type": "VirtualLocation" as const, url: e.virtual_url ?? siteUrl },
          ];

  const attendanceMode =
    e.location_type === "virtual"
      ? "https://schema.org/OnlineEventAttendanceMode"
      : e.location_type === "physical"
        ? "https://schema.org/OfflineEventAttendanceMode"
        : "https://schema.org/MixedEventAttendanceMode";

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.title,
    description: e.description ?? undefined,
    startDate: e.start_time,
    endDate: e.end_time,
    eventAttendanceMode: attendanceMode,
    eventStatus: "https://schema.org/EventScheduled",
    location,
    organizer: {
      "@type": "Organization",
      name: "PTNKAlum",
      url: siteUrl,
    },
    ...(e.cover_image_url ? { image: e.cover_image_url } : {}),
    ...(e.capacity ? { maximumAttendeeCapacity: e.capacity } : {}),
  };
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!event) notFound();

  const e = event as EventRow;

  // Host check
  const { data: isHost } = await supabase.rpc("is_event_host", {
    p_event_id: id,
    p_user_id: user.id,
  });

  // Group info (if linked)
  let groupInfo: { name: string; slug: string } | null = null;
  let canBulkInvite = false;
  if (e.group_id) {
    const { data: group } = await supabase
      .from("groups")
      .select("name, slug")
      .eq("id", e.group_id)
      .maybeSingle();
    if (group) {
      groupInfo = group;
    }
    // Check if current user is owner/moderator of the group (for bulk invite)
    if (isHost) {
      const { data: membership } = await supabase
        .from("group_members")
        .select("role")
        .eq("group_id", e.group_id)
        .eq("user_id", user.id)
        .maybeSingle();
      canBulkInvite =
        !!membership &&
        ["owner", "moderator"].includes(membership.role);
    }
  }

  // Verified check for RSVP gating
  const { data: me } = await supabase
    .from("users")
    .select("verification_status, muted_until")
    .eq("id", user.id)
    .single();
  const isVerified = me?.verification_status === "verified";
  const isMuted = Boolean(me?.muted_until && new Date(me.muted_until) > new Date());

  // Public Going count (via SECURITY DEFINER RPC — bypasses RLS name privacy)
  const { data: goingCount } = await supabase.rpc("get_event_going_count", {
    p_event_id: id,
  });

  // Current user's RSVP state
  const { data: myRsvp } = await supabase
    .from("event_rsvps")
    .select("*")
    .eq("event_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: myWaitlist } = await supabase
    .from("event_waitlist")
    .select("id")
    .eq("event_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  // Attendee names are gated inside get_event_going_attendee_ids RPC:
  // it returns an empty set unless the caller is a host or has their own
  // Going RSVP on this event. That keeps privacy enforcement at the DB
  // layer without needing a self-referential RLS policy.
  const { data: attendeeIds } = await supabase.rpc(
    "get_event_going_attendee_ids",
    { p_event_id: id }
  );

  let attendeeNames: string[] = [];
  const ids = (attendeeIds ?? []) as string[];
  if (ids.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", ids);
    attendeeNames = (profiles ?? [])
      .map((p) => p.full_name)
      .filter((n): n is string => Boolean(n));
  }
  const canSeeNames = attendeeNames.length > 0;

  // Comments
  const commentsResult = await getEventComments(id);
  const initialComments = commentsResult.success ? commentsResult.data.comments : [];
  const initialTotalCount = commentsResult.success ? commentsResult.data.totalCount : 0;
  const initialTotalPages = commentsResult.success ? commentsResult.data.totalPages : 0;

  const now = new Date();
  const isPast = new Date(e.end_time) < now;
  const checkinWindowStart = new Date(new Date(e.start_time).getTime() - 2 * 60 * 60 * 1000);
  const checkinWindowEnd = new Date(new Date(e.end_time).getTime() + 2 * 60 * 60 * 1000);
  const showCheckin = now >= checkinWindowStart && now <= checkinWindowEnd;

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6">
      {e.is_public && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildEventJsonLd(e)),
          }}
        />
      )}
      {/* Cover */}
      {e.cover_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={e.cover_image_url}
          alt=""
          className="h-48 w-full rounded-xl object-cover sm:h-64"
        />
      ) : (
        <div className="h-48 w-full rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 sm:h-64" />
      )}

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{e.title}</h1>
        {e.series_id && (
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            Recurring event
          </span>
        )}
        {groupInfo && (
          <p className="text-sm">
            Organized by{" "}
            <Link
              href={`/groups/${groupInfo.slug}`}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
            >
              {groupInfo.name}
            </Link>
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          {formatRange(e.start_time, e.end_time, e.event_timezone)}
        </p>
        <p className="text-xs text-muted-foreground">
          Event timezone: {e.event_timezone}
        </p>
      </header>

      {isPast && (
        <div className="rounded-md border border-muted bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          This event has ended.
        </div>
      )}

      {/* Location */}
      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
          Location
        </h2>
        {e.location_type !== "virtual" && e.address && (
          <p className="text-sm">{e.address}</p>
        )}
        {e.location_type !== "physical" && e.virtual_url && (
          <p className="text-sm">
            <a
              href={e.virtual_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4"
            >
              Join virtually
            </a>
          </p>
        )}
      </section>

      {/* Description */}
      {e.description && (
        <section className="whitespace-pre-wrap text-sm">
          {e.description}
        </section>
      )}

      {/* Going count */}
      <section className="flex items-center gap-4 rounded-xl border bg-card p-4 text-sm">
        <span className="font-medium">{goingCount ?? 0} going</span>
        {e.capacity && (
          <span className="text-muted-foreground">
            of {e.capacity} capacity
          </span>
        )}
      </section>

      {/* RSVP controls */}
      {!isPast && (
        <RsvpControls
          eventId={e.id}
          currentStatus={myRsvp?.status ?? null}
          isWaitlisted={Boolean(myWaitlist)}
          needsReconfirm={myRsvp?.needs_reconfirm ?? false}
          disabled={!isVerified}
        />
      )}
      {!isVerified && !isPast && (
        <p className="text-xs text-muted-foreground">
          <Link href="/verification" className="underline">
            Verify your account
          </Link>{" "}
          to RSVP.
        </p>
      )}

      {/* Attendee names (gated) */}
      {canSeeNames && attendeeNames.length > 0 && (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
            Attendees
          </h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {attendeeNames.map((n) => (
              <li
                key={n}
                className="rounded-full bg-muted px-3 py-1 text-xs"
              >
                {n}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ICS download */}
      <div>
        <a
          href={`/api/events/${e.id}/ics`}
          className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Download .ics
        </a>
      </div>

      {/* Comments */}
      <EventComments
        eventId={e.id}
        currentUserId={user.id}
        isVerified={isVerified}
        isMuted={isMuted}
        initialComments={initialComments}
        initialTotalCount={initialTotalCount}
        initialTotalPages={initialTotalPages}
      />

      {/* Series navigation */}
      {e.series_id && (
        <SeriesNav eventId={e.id} seriesId={e.series_id} seriesIndex={e.series_index ?? 0} />
      )}

      {/* Host actions */}
      {isHost && (
        <HostActions eventId={e.id} showCheckin={showCheckin} seriesId={e.series_id} />
      )}

      {/* Bulk invite (group-linked events, owner/moderator only) */}
      {canBulkInvite && groupInfo && !isPast && (
        <section className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Group invite</p>
              <p className="text-xs text-muted-foreground">
                Invite all members of {groupInfo.name}
              </p>
            </div>
            <BulkInviteButton
              eventId={e.id}
              groupName={groupInfo.name}
            />
          </div>
        </section>
      )}
    </article>
  );
}

export const dynamic = "force-dynamic";
