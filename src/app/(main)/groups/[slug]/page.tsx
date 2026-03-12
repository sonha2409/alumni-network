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
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getGroupBySlug, getGroupMembers } from "@/lib/queries/groups";
import type { GroupType } from "@/lib/types";
import { MemberList } from "./member-list";
import { MemberFilters } from "./member-filters";

const typeLabels: Record<GroupType, { label: string; icon: typeof CalendarIcon }> = {
  year_based: { label: "Year-based", icon: CalendarIcon },
  field_based: { label: "Field-based", icon: BriefcaseIcon },
  location_based: { label: "Location-based", icon: MapPinIcon },
  custom: { label: "Custom", icon: TagIcon },
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
  if (!user) return { title: "Group — AlumNet" };

  const group = await getGroupBySlug(slug, user.id);
  if (!group) return { title: "Group not found — AlumNet" };

  return {
    title: `${group.name} — AlumNet`,
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

  const membersResult = await getGroupMembers(group.id, {
    search: memberSearch,
    page: memberPage,
    pageSize: 20,
  });

  const TypeIcon = typeLabels[group.type].icon;

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <Link
        href="/groups"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        All groups
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
                {typeLabels[group.type].label}
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
                {group.member_count} {group.member_count === 1 ? "member" : "members"}
              </span>
              <span>
                Created by{" "}
                <span className="font-medium text-foreground">
                  {group.created_by_name}
                </span>
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
            Verify your account
          </Link>{" "}
          to join this group.
        </div>
      )}

      {/* Members section */}
      <div>
        <h2 className="text-lg font-semibold">Members</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {membersResult.totalCount} {membersResult.totalCount === 1 ? "member" : "members"} in this group
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
              ? "No members match your search."
              : "No members yet. Be the first to join!"}
          </p>
        </div>
      )}
    </div>
  );
}

// Extracted as a client component import to avoid making the whole page a client component
import { MembershipButton } from "./membership-button";
