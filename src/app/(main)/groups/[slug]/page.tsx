import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  UsersIcon,
  CalendarIcon,
  BriefcaseIcon,
  MapPinIcon,
  TagIcon,
  ArrowLeftIcon,
  CalendarDaysIcon,
} from "lucide-react";

import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getGroupBySlug, getGroupMembers } from "@/lib/queries/groups";
import type { GroupType } from "@/lib/types";
import { MemberList } from "./member-list";
import { MemberFilters } from "./member-filters";

const typeIcons: Record<GroupType, typeof CalendarIcon> = {
  year_based: CalendarIcon,
  field_based: BriefcaseIcon,
  location_based: MapPinIcon,
  custom: TagIcon,
};

const typeLabelKeys: Record<GroupType, string> = {
  year_based: "yearBased",
  field_based: "fieldBased",
  location_based: "locationBased",
  custom: "custom",
};

interface GroupDetailPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
}: GroupDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { title: "Group — PTNKAlum" };

  const group = await getGroupBySlug(slug, user.id);
  if (!group) return { title: "Group not found — PTNKAlum" };

  return {
    title: `${group.name} — PTNKAlum`,
    description: group.description ?? `Alumni group: ${group.name}`,
  };
}

export default async function GroupDetailPage({
  params,
  searchParams,
}: GroupDetailPageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { slug } = await params;
  const group = await getGroupBySlug(slug, user.id);

  if (!group) {
    notFound();
  }

  const { data: currentUser } = await supabase
    .from("users")
    .select("verification_status")
    .eq("id", user.id)
    .single();

  const isVerified = currentUser?.verification_status === "verified";

  const rawParams = await searchParams;
  const memberSearch =
    typeof rawParams.q === "string" && rawParams.q.trim()
      ? rawParams.q.trim()
      : undefined;
  const memberPage =
    typeof rawParams.page === "string"
      ? parseInt(rawParams.page, 10) || 1
      : 1;

  const t = await getTranslations("groups");

  const membersResult = await getGroupMembers(group.id, {
    search: memberSearch,
    page: memberPage,
    pageSize: 20,
  });

  // Upcoming events linked to this group
  const nowIso = new Date().toISOString();
  const { data: upcomingEvents } = await supabase
    .from("events")
    .select("id, title, start_time, end_time, event_timezone, location_type, address")
    .eq("group_id", group.id)
    .is("deleted_at", null)
    .gte("start_time", nowIso)
    .order("start_time", { ascending: true })
    .limit(5);

  const TypeIcon = typeIcons[group.type];

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <Link
        href="/groups"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        {t("allGroups")}
      </Link>

      {/* Group header */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {group.name}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                <TypeIcon className="h-3 w-3" />
                {t(typeLabelKeys[group.type])}
              </span>
            </div>

            {group.description && (
              <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
                {group.description}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <UsersIcon className="h-3.5 w-3.5" />
                {t("membersCount", { count: group.member_count })}
              </span>
              <span>
                {t("createdBy", { name: group.created_by_name })}
              </span>
            </div>
          </div>

          {/* Join/Leave button */}
          {isVerified && (
            <MembershipButton groupId={group.id} isMember={group.is_member} />
          )}
        </div>
      </div>

      {/* Unverified banner */}
      {!isVerified && (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/50 px-4 py-3 text-center text-sm text-muted-foreground">
          <Link href="/verification" className="text-primary underline underline-offset-4">
            {t("verifyToJoin")}
          </Link>
        </div>
      )}

      {/* Upcoming events */}
      {(upcomingEvents ?? []).length > 0 && (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase text-muted-foreground">
            <CalendarDaysIcon className="h-4 w-4" />
            Upcoming events
          </h2>
          <ul className="divide-y">
            {(upcomingEvents ?? []).map((ev) => (
              <li key={ev.id} className="py-2.5 first:pt-0 last:pb-0">
                <Link
                  href={`/events/${ev.id}`}
                  className="group flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-sm font-medium group-hover:text-primary">
                    {ev.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: ev.event_timezone,
                    }).format(new Date(ev.start_time))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Members section */}
      <div>
        <h2 className="text-lg font-semibold">{t("membersHeader")}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("membersCount", { count: membersResult.totalCount })}
        </p>
      </div>

      {/* Member search */}
      <MemberFilters />

      {/* Member list */}
      {membersResult.members.length > 0 ? (
        <MemberList
          members={membersResult.members}
          currentPage={membersResult.page}
          totalPages={membersResult.totalPages}
        />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
          <UsersIcon className="h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            {memberSearch
              ? t("noMembersSearch")
              : t("noMembersYet")}
          </p>
        </div>
      )}
    </div>
  );
}

// Extracted as a client component import to avoid making the whole page a client component
import { MembershipButton } from "./membership-button";
