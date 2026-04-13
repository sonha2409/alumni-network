"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  Calendar,
  MapPin,
  Globe,
  Lock,
  Users,
  Monitor,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminEventRow, AdminEventFilters, AdminEventStatus } from "@/lib/types";
import { getAdminEvents, getAdminEventStats } from "./actions";
import { EventDetailSheet } from "./event-detail-sheet";

// =============================================================================
// Badge components
// =============================================================================

function EventStatusBadge({ event }: { event: AdminEventRow }) {
  const t = useTranslations("admin.events");

  if (event.deleted_at) {
    const isAdminCancel = !!event.moderation_action;
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
        {isAdminCancel ? t("cancelledByAdmin") : t("cancelled")}
      </span>
    );
  }

  const now = new Date();
  const end = new Date(event.end_time);
  const start = new Date(event.start_time);

  if (end < now) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
        {t("past")}
      </span>
    );
  }

  if (start <= now && end >= now) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
        {t("ongoing")}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
      {t("upcoming")}
    </span>
  );
}

function LocationIcon({ type }: { type: string }) {
  switch (type) {
    case "physical":
      return <MapPin className="size-3.5 text-muted-foreground" />;
    case "virtual":
      return <Monitor className="size-3.5 text-muted-foreground" />;
    default:
      return <Globe className="size-3.5 text-muted-foreground" />;
  }
}

// =============================================================================
// Stats cards
// =============================================================================

function StatsCards({
  stats,
  loading,
}: {
  stats: { totalActive: number; upcomingThisWeek: number; cancelledByAdmin: number; totalRsvps: number } | null;
  loading: boolean;
}) {
  const t = useTranslations("admin.events");

  const cards = [
    { label: t("statActive"), value: stats?.totalActive ?? 0 },
    { label: t("statUpcoming"), value: stats?.upcomingThisWeek ?? 0 },
    { label: t("statCancelled"), value: stats?.cancelledByAdmin ?? 0 },
    { label: t("statRsvps"), value: stats?.totalRsvps ?? 0 },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="pt-6">
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">{card.value}</p>
            )}
            <p className="text-sm text-muted-foreground">{card.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// =============================================================================
// Main client component
// =============================================================================

export function EventManagementClient() {
  const t = useTranslations("admin.events");
  const tCommon = useTranslations("common");

  const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: "", label: t("allStatuses") },
    { value: "active", label: t("statusActive") },
    { value: "cancelled", label: t("statusCancelled") },
    { value: "past", label: t("statusPast") },
  ];

  const VISIBILITY_OPTIONS: { value: string; label: string }[] = [
    { value: "", label: t("allVisibility") },
    { value: "true", label: t("publicOnly") },
    { value: "false", label: t("privateOnly") },
  ];

  const [events, setEvents] = useState<AdminEventRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalActive: number;
    upcomingThisWeek: number;
    cancelledByAdmin: number;
    totalRsvps: number;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("");
  const [page, setPage] = useState(1);

  // Sheet
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    const result = await getAdminEventStats();
    if (result.success) {
      setStats(result.data);
    }
    setStatsLoading(false);
  }, []);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    const filters: AdminEventFilters = { page, pageSize: 20 };
    if (search.trim()) filters.search = search.trim();
    if (statusFilter) filters.status = statusFilter as AdminEventStatus;
    if (visibilityFilter) filters.isPublic = visibilityFilter === "true";

    const result = await getAdminEvents(filters);
    if (result.success) {
      setEvents(result.data.events);
      setTotalCount(result.data.totalCount);
      setTotalPages(result.data.totalPages);
    } else {
      toast.error(result.error);
    }
    setIsLoading(false);
  }, [search, statusFilter, visibilityFilter, page]);

  // Load stats on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchEvents();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Fetch on filter/page change (non-search)
  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, visibilityFilter, page]);

  function handleFilterChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLSelectElement>) => {
      setter(e.target.value);
      setPage(1);
    };
  }

  function handleActionComplete() {
    fetchEvents();
    fetchStats();
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <>
      <StatsCards stats={stats} loading={statsLoading} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t("eventsHeader")}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {t("total", { count: totalCount })}
            </span>
          </CardTitle>

          {/* Filters */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              type="search"
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
              aria-label={t("searchAriaLabel")}
            />
            <div className="flex flex-wrap gap-2">
              <select
                value={statusFilter}
                onChange={handleFilterChange(setStatusFilter)}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                aria-label={t("filterStatus")}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={visibilityFilter}
                onChange={handleFilterChange(setVisibilityFilter)}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                aria-label={t("filterVisibility")}
              >
                {VISIBILITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {t("noEventsFound")}
            </p>
          ) : (
            <>
              {/* Table header */}
              <div className="hidden lg:grid lg:grid-cols-[2fr_1fr_auto_auto_auto_auto_auto] lg:gap-4 lg:border-b lg:pb-3 lg:text-sm lg:font-medium lg:text-muted-foreground">
                <div>{t("colTitle")}</div>
                <div>{t("colCreator")}</div>
                <div>{t("colDate")}</div>
                <div>{t("colType")}</div>
                <div>{t("colRsvps")}</div>
                <div>{t("colStatus")}</div>
                <div>{t("colAction")}</div>
              </div>

              {/* Table rows */}
              <div className="divide-y">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="grid grid-cols-1 gap-2 py-3 lg:grid-cols-[2fr_1fr_auto_auto_auto_auto_auto] lg:items-center lg:gap-4"
                  >
                    {/* Title + visibility */}
                    <div className="flex items-center gap-2 min-w-0">
                      <Calendar className="size-4 flex-shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{event.title}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {event.is_public ? (
                            <Globe className="size-3" />
                          ) : (
                            <Lock className="size-3" />
                          )}
                          <span>{event.is_public ? t("public") : t("private")}</span>
                          {event.series_id && (
                            <span className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px]">
                              {t("recurring")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Creator */}
                    <div className="min-w-0">
                      <p className="truncate text-sm">
                        <span className="lg:hidden font-medium text-foreground">{t("colCreator")}: </span>
                        {event.creator_name ?? event.creator_email}
                      </p>
                    </div>

                    {/* Date */}
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                      <span className="lg:hidden font-medium text-foreground">{t("colDate")}: </span>
                      {formatDate(event.start_time)}
                    </div>

                    {/* Location type */}
                    <div className="flex items-center gap-1">
                      <span className="lg:hidden text-sm text-muted-foreground">{t("colType")}: </span>
                      <LocationIcon type={event.location_type} />
                      <span className="text-xs text-muted-foreground capitalize">{event.location_type}</span>
                    </div>

                    {/* RSVPs */}
                    <div className="flex items-center gap-1">
                      <span className="lg:hidden text-sm text-muted-foreground">{t("colRsvps")}: </span>
                      <Users className="size-3.5 text-muted-foreground" />
                      <span className="text-sm">{event.going_count}</span>
                    </div>

                    {/* Status */}
                    <div>
                      <EventStatusBadge event={event} />
                    </div>

                    {/* Action */}
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedEventId(event.id);
                          setSheetOpen(true);
                        }}
                      >
                        {t("manage")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <p className="text-sm text-muted-foreground">
                    {tCommon("page", { page, totalPages })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      {tCommon("previous")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      {tCommon("next")}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <EventDetailSheet
        eventId={selectedEventId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onActionComplete={handleActionComplete}
      />
    </>
  );
}
