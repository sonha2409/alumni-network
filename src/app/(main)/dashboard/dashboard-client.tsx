"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  LayoutGrid,
  List,
  ArrowRight,
  Search,
  UserPlus,
  TrendingUp,
  Flame,
} from "lucide-react";

import { useTranslations } from "next-intl";
import type { RecommendedProfile, PopularProfile } from "@/lib/types";
import { RecommendationCard } from "./recommendation-card";
import { RecommendationListItem } from "./recommendation-list-item";
import { PopularCard } from "./popular-card";

interface DashboardClientProps {
  userName: string;
  hasProfile: boolean;
  recommendations: RecommendedProfile[];
  popularAlumni: PopularProfile[];
  connectionStatuses: Record<
    string,
    "connected" | "pending_sent" | "pending_received"
  >;
  profileCompleteness: number;
}

export function DashboardClient({
  userName,
  hasProfile,
  recommendations,
  popularAlumni,
  connectionStatuses,
  profileCompleteness,
}: DashboardClientProps) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filter popular alumni that aren't already in recommendations
  const recommendedIds = new Set(recommendations.map((r) => r.id));
  const filteredPopular = popularAlumni.filter((p) => !recommendedIds.has(p.id));

  return (
    <div className="flex flex-col gap-8">
      {/* Hero greeting */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent border border-border p-6 sm:p-8">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl animate-in fade-in slide-in-from-bottom-2 duration-500">
            {t("welcomeBack", { name: userName })}
          </h1>
          <p className="mt-2 text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
            {hasProfile
              ? t("subtitle")
              : t("subtitleNoProfile")}
          </p>
        </div>
        {/* Decorative gradient orb */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-chart-2/5 blur-2xl" />
      </div>

      {/* Profile completeness nudge */}
      {hasProfile && profileCompleteness < 70 && (
        <Link
          href="/profile/edit"
          className="group flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 transition-all duration-200 hover:border-amber-300 hover:shadow-sm dark:border-amber-500/20 dark:bg-amber-500/5 dark:hover:border-amber-500/30 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15">
            <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              {t("profileCompleteness", { percent: profileCompleteness })}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400/70">
              {t("completenessHint")}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-amber-600 transition-transform group-hover:translate-x-0.5 dark:text-amber-400" />
        </Link>
      )}

      {/* No profile state */}
      {!hasProfile && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <UserPlus className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">{t("createProfile")}</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {t("createProfileDesc")}
          </p>
          <Link
            href="/profile/create"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90 hover:shadow-md active:scale-[0.98]"
          >
            {t("getStarted")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Recommendations section */}
      {hasProfile && (
        <section>
          {/* Section header with view toggle */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-tight">
                  {t("suggestedAlumni")}
                </h2>
                {recommendations.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t("alumniCount", { count: recommendations.length })}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View toggle */}
              {recommendations.length > 0 && (
                <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`flex h-7 w-7 items-center justify-center rounded-md transition-all duration-200 ${
                      viewMode === "grid"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    aria-label={t("gridView")}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`flex h-7 w-7 items-center justify-center rounded-md transition-all duration-200 ${
                      viewMode === "list"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    aria-label={t("listView")}
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Directory link */}
              <Link
                href="/directory"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:border-foreground/20 hover:text-foreground hover:shadow-sm"
              >
                <Search className="h-3 w-3" />
                {t("browseDirectory")}
              </Link>
            </div>
          </div>

          {/* Recommendation cards */}
          {recommendations.length > 0 ? (
            <div className="mt-5">
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {recommendations.map((profile, index) => (
                    <RecommendationCard
                      key={profile.id}
                      profile={profile}
                      connectionStatus={connectionStatuses[profile.user_id]}
                      index={index}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {recommendations.map((profile, index) => (
                    <RecommendationListItem
                      key={profile.id}
                      profile={profile}
                      connectionStatus={connectionStatuses[profile.user_id]}
                      index={index}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-5 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center animate-in fade-in zoom-in-95 duration-500">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-3">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-semibold">
                {t("noSuggestions")}
              </h3>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                {t("noSuggestionsDesc")}
              </p>
              <Link
                href="/directory"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90 active:scale-[0.98]"
              >
                {t("browseTheDirectory")}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {/* Mobile directory link */}
          {recommendations.length > 0 && (
            <div className="mt-4 sm:hidden">
              <Link
                href="/directory"
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:border-foreground/20 hover:text-foreground"
              >
                <Search className="h-3.5 w-3.5" />
                {t("browseFullDirectory")}
              </Link>
            </div>
          )}
        </section>
      )}

      {/* Popular Alumni section */}
      {hasProfile && filteredPopular.length > 0 && (
        <section>
          <div className="flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 dark:bg-orange-500/15">
              <Flame className="h-4 w-4 text-orange-500 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold leading-tight">
                {t("trendingAlumni")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t("trendingDesc")}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredPopular.slice(0, 8).map((profile, index) => (
              <PopularCard
                key={profile.id}
                profile={profile}
                connectionStatus={connectionStatuses[profile.user_id]}
                index={index}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
