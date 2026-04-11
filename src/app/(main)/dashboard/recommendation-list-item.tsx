"use client";

import Link from "next/link";
import Image from "next/image";
import {
  BriefcaseIcon,
  MapPinIcon,
  GraduationCapIcon,
  UserCheck,
  Clock,
  Zap,
  ChevronRight,
} from "lucide-react";

import { useTranslations } from "next-intl";
import { CountryFlag } from "@/components/country-flag";
import { CompanyLogo } from "@/components/company-logo";
import { countryToFlag } from "@/lib/country-flags";
import type { RecommendedProfile } from "@/lib/types";

interface RecommendationListItemProps {
  profile: RecommendedProfile;
  connectionStatus?: "connected" | "pending_sent" | "pending_received";
  index: number;
}

export function RecommendationListItem({
  profile,
  connectionStatus,
  index,
}: RecommendationListItemProps) {
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

  const animDelay = Math.min(index * 30, 300);

  return (
    <Link
      href={`/profile/${profile.id}`}
      className="group flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5 transition-all duration-200 hover:border-foreground/20 hover:bg-accent/50 hover:shadow-sm animate-in fade-in slide-in-from-left-2 duration-400"
      style={{ animationDelay: `${animDelay}ms`, animationFillMode: "both" }}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        {profile.photo_url ? (
          <Image
            src={profile.photo_url}
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 rounded-full object-cover ring-1 ring-border transition-all duration-200 group-hover:ring-primary/30"
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 text-sm font-semibold text-primary/70 ring-1 ring-border">
            {initials}
          </div>
        )}
        {connectionStatus && (
          <span
            className={`absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-2 ring-card ${
              connectionStatus === "connected"
                ? "bg-emerald-500"
                : "bg-amber-500"
            }`}
          >
            {connectionStatus === "connected" ? (
              <UserCheck className="h-2 w-2 text-white" />
            ) : (
              <Clock className="h-2 w-2 text-white" />
            )}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-foreground transition-colors duration-200 group-hover:text-primary">
            {profile.full_name}
          </h3>
          {profile.score > 0 && (
            <span className={`hidden sm:inline-flex items-center gap-0.5 text-[10px] font-semibold ${scoreColor}`}>
              <Zap className="h-2.5 w-2.5" />
              {scoreLabel}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <GraduationCapIcon className="h-3 w-3" />
            {tc("classOf", { year: profile.graduation_year })}
          </span>
          {(profile.current_job_title || profile.current_company) && (
            <span className="hidden sm:inline-flex items-center gap-1">
              {profile.current_company ? (
                <CompanyLogo companyName={profile.current_company} companyWebsite={profile.current_company_website} size={14} />
              ) : (
                <BriefcaseIcon className="h-3 w-3" />
              )}
              <span className="max-w-[200px] truncate">
                {profile.current_job_title && profile.current_company
                  ? `${profile.current_job_title} at ${profile.current_company}`
                  : profile.current_job_title || profile.current_company}
              </span>
            </span>
          )}
          {location && (
            <span className="hidden md:inline-flex items-center gap-1">
              <CountryFlag country={profile.country} />
              {!countryToFlag(profile.country) && <MapPinIcon className="h-3 w-3" />}
              <span className="max-w-[160px] truncate">{location}</span>
            </span>
          )}
        </div>
      </div>

      {/* Industry badge + arrow */}
      <div className="hidden sm:flex items-center gap-3 shrink-0">
        {profile.primary_industry && (
          <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
            {profile.primary_industry.name}
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-all duration-200 group-hover:text-foreground group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
