"use client";

import Link from "next/link";
import {
  BriefcaseIcon,
  MapPinIcon,
  GraduationCapIcon,
  UserCheck,
  Clock,
  Zap,
} from "lucide-react";

import { useTranslations } from "next-intl";
import type { RecommendedProfile } from "@/lib/types";

interface RecommendationCardProps {
  profile: RecommendedProfile;
  connectionStatus?: "connected" | "pending_sent" | "pending_received";
  index: number;
}

export function RecommendationCard({
  profile,
  connectionStatus,
  index,
}: RecommendationCardProps) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");

  function getScoreLabel(score: number): { label: string; color: string } {
    if (score >= 30) return { label: t("greatMatch"), color: "text-emerald-600 dark:text-emerald-400" };
    if (score >= 20) return { label: t("strongMatch"), color: "text-blue-600 dark:text-blue-400" };
    if (score >= 10) return { label: t("goodMatch"), color: "text-violet-600 dark:text-violet-400" };
    return { label: t("match"), color: "text-muted-foreground" };
  }
  const location = [profile.city, profile.state_province, profile.country]
    .filter(Boolean)
    .join(", ");

  const initials = profile.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const { label: scoreLabel, color: scoreColor } = getScoreLabel(profile.score);

  // Stagger animation delay based on card index (capped at 400ms)
  const animDelay = Math.min(index * 50, 400);

  return (
    <Link
      href={`/profile/${profile.id}`}
      className="group relative flex flex-col rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:border-foreground/20 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5 dark:hover:shadow-black/20 animate-in fade-in slide-in-from-bottom-3 duration-500 sm:p-5"
      style={{ animationDelay: `${animDelay}ms`, animationFillMode: "both" }}
    >
      {/* Match score badge */}
      {profile.score > 0 && (
        <div className="absolute -top-2.5 right-3 flex items-center gap-1 rounded-full bg-background border border-border px-2 py-0.5 shadow-sm">
          <Zap className={`h-3 w-3 ${scoreColor}`} />
          <span className={`text-[10px] font-semibold ${scoreColor}`}>
            {scoreLabel}
          </span>
        </div>
      )}

      {/* Top section: avatar + name */}
      <div className="flex items-start gap-3.5 mt-1">
        {/* Avatar */}
        <div className="relative shrink-0">
          {profile.photo_url ? (
            <img
              src={profile.photo_url}
              alt=""
              className="h-12 w-12 rounded-full object-cover ring-1 ring-border transition-all duration-300 group-hover:ring-primary/30 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 text-sm font-semibold text-primary/70 ring-1 ring-border transition-all duration-300 group-hover:ring-primary/30">
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
                  ? t("connected")
                  : connectionStatus === "pending_sent"
                    ? t("requestSent")
                    : t("wantsToConnect")
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
          <h3 className="truncate text-sm font-semibold leading-tight text-foreground transition-colors duration-200 group-hover:text-primary">
            {profile.full_name}
          </h3>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <GraduationCapIcon className="h-3 w-3 shrink-0" />
            <span>{tc("classOf", { year: profile.graduation_year })}</span>
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
          <span className="inline-block rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground transition-colors duration-200 group-hover:bg-primary/10 group-hover:text-primary">
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

      {/* Hover gradient indicator */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/0 to-transparent transition-all duration-300 group-hover:via-primary/40" />
    </Link>
  );
}
