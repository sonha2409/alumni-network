import Link from "next/link";
import Image from "next/image";
import {
  BriefcaseIcon,
  MapPinIcon,
  GraduationCapIcon,
  UserCheck,
  Clock,
} from "lucide-react";
import { useTranslations } from "next-intl";

import type { DirectoryProfile } from "@/lib/types";

interface DirectoryGridProps {
  profiles: DirectoryProfile[];
  connectionStatuses?: Record<
    string,
    "connected" | "pending_sent" | "pending_received"
  >;
}

export function DirectoryGrid({
  profiles,
  connectionStatuses,
}: DirectoryGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {profiles.map((profile) => (
        <ProfileCard
          key={profile.id}
          profile={profile}
          connectionStatus={connectionStatuses?.[profile.user_id]}
        />
      ))}
    </div>
  );
}

function ProfileCard({
  profile,
  connectionStatus,
}: {
  profile: DirectoryProfile;
  connectionStatus?: "connected" | "pending_sent" | "pending_received";
}) {
  const t = useTranslations("common");
  const tDash = useTranslations("dashboard");
  const location = [profile.city, profile.state_province, profile.country]
    .filter(Boolean)
    .join(", ");

  const initials = profile.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      href={`/profile/${profile.id}`}
      className="group relative flex flex-col rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 dark:hover:shadow-primary/5"
    >
      {/* Top section: avatar + name */}
      <div className="flex items-start gap-3.5">
        {/* Avatar */}
        <div className="relative shrink-0">
          {profile.photo_url ? (
            <Image
              src={profile.photo_url}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground ring-1 ring-border">
              {initials}
            </div>
          )}
          {/* Connection status dot */}
          {connectionStatus && (
            <span
              className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-card ${
                connectionStatus === "connected"
                  ? "bg-emerald-500"
                  : "bg-amber-500"
              }`}
              title={
                connectionStatus === "connected"
                  ? tDash("connected")
                  : connectionStatus === "pending_sent"
                    ? tDash("requestSent")
                    : tDash("wantsToConnect")
              }
            >
              {connectionStatus === "connected" ? (
                <UserCheck className="h-2.5 w-2.5 text-white" />
              ) : (
                <Clock className="h-2.5 w-2.5 text-white" />
              )}
            </span>
          )}
        </div>

        {/* Name + class */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold leading-tight text-foreground group-hover:text-primary transition-colors">
            {profile.full_name}
          </h3>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <GraduationCapIcon className="h-3 w-3 shrink-0" />
            <span>{t("classOf", { year: profile.graduation_year })}</span>
          </div>
        </div>
      </div>

      {/* Career info */}
      {(profile.current_job_title || profile.current_company) && (
        <div className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
          <BriefcaseIcon className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="line-clamp-2">
            {profile.current_job_title && profile.current_company
              ? `${profile.current_job_title} at ${profile.current_company}`
              : profile.current_job_title || profile.current_company}
          </span>
        </div>
      )}

      {/* Industry */}
      {profile.primary_industry && (
        <div className="mt-2">
          <span className="inline-block rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
            {profile.primary_industry.name}
            {profile.primary_specialization &&
              ` · ${profile.primary_specialization.name}`}
          </span>
        </div>
      )}

      {/* Location */}
      {location && (
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPinIcon className="h-3 w-3 shrink-0" />
          <span className="truncate">{location}</span>
        </div>
      )}

      {/* Availability tags */}
      {profile.availability_tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {profile.availability_tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-medium text-primary dark:bg-primary/15"
            >
              {tag.name}
            </span>
          ))}
          {profile.availability_tags.length > 3 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              +{profile.availability_tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Subtle hover indicator */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-gradient-to-r from-transparent via-primary/0 to-transparent transition-all group-hover:via-primary/40" />
    </Link>
  );
}
