"use client";

import Link from "next/link";
import Image from "next/image";
import {
  BriefcaseIcon,
  MapPinIcon,
  GraduationCapIcon,
  UserCheck,
  Clock,
  TrendingUp,
  Users,
  Eye,
} from "lucide-react";

import { useTranslations } from "next-intl";
import type { PopularProfile } from "@/lib/types";

interface PopularCardProps {
  profile: PopularProfile;
  connectionStatus?: "connected" | "pending_sent" | "pending_received";
  index: number;
}

export function PopularCard({
  profile,
  connectionStatus,
  index,
}: PopularCardProps) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const location = [profile.city, profile.state_province, profile.country]
    .filter(Boolean)
    .join(", ");

  const initials = profile.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const animDelay = Math.min(index * 50, 400);

  return (
    <Link
      href={`/profile/${profile.id}`}
      className="group relative flex flex-col rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:border-foreground/20 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5 dark:hover:shadow-black/20 animate-in fade-in slide-in-from-bottom-3 duration-500 sm:p-5"
      style={{ animationDelay: `${animDelay}ms`, animationFillMode: "both" }}
    >
      {/* Trending badge */}
      <div className="absolute -top-2.5 right-3 flex items-center gap-1 rounded-full bg-background border border-border px-2 py-0.5 shadow-sm">
        <TrendingUp className="h-3 w-3 text-orange-500 dark:text-orange-400" />
        <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400">
          {t("trending")}
        </span>
      </div>

      {/* Top section: avatar + name */}
      <div className="flex items-start gap-3.5 mt-1">
        <div className="relative shrink-0">
          {profile.photo_url ? (
            <Image
              src={profile.photo_url}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 rounded-full object-cover ring-1 ring-border transition-all duration-300 group-hover:ring-primary/30 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-500/15 to-orange-500/5 text-sm font-semibold text-orange-600/70 ring-1 ring-border transition-all duration-300 group-hover:ring-orange-500/30 dark:text-orange-400/70">
              {initials}
            </div>
          )}
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

      {/* Popularity stats */}
      <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
        {profile.connection_count > 0 && (
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{tc("connections", { count: profile.connection_count })}</span>
          </div>
        )}
        {profile.view_count > 0 && (
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            <span>{tc("views", { count: profile.view_count })}</span>
          </div>
        )}
      </div>

      {/* Hover gradient indicator */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/0 to-transparent transition-all duration-300 group-hover:via-primary/40" />
    </Link>
  );
}
