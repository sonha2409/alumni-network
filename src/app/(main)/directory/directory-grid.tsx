import Link from "next/link";
import {
  BriefcaseIcon,
  MapPinIcon,
  GraduationCapIcon,
} from "lucide-react";

import type { DirectoryProfile } from "@/lib/types";

interface DirectoryGridProps {
  profiles: DirectoryProfile[];
}

export function DirectoryGrid({ profiles }: DirectoryGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {profiles.map((profile) => (
        <ProfileCard key={profile.id} profile={profile} />
      ))}
    </div>
  );
}

function ProfileCard({ profile }: { profile: DirectoryProfile }) {
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
      className="group relative flex flex-col rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-foreground/20 hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20"
    >
      {/* Top section: avatar + name */}
      <div className="flex items-start gap-3.5">
        {/* Avatar */}
        {profile.photo_url ? (
          <img
            src={profile.photo_url}
            alt=""
            className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-border"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground ring-1 ring-border">
            {initials}
          </div>
        )}

        {/* Name + class */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold leading-tight text-foreground group-hover:text-primary transition-colors">
            {profile.full_name}
          </h3>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <GraduationCapIcon className="h-3 w-3 shrink-0" />
            <span>Class of {profile.graduation_year}</span>
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
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/0 to-transparent transition-all group-hover:via-primary/30" />
    </Link>
  );
}
