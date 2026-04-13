"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  Calendar,
  MapPin,
  Globe,
  Lock,
  Users,
  Monitor,
  MessageSquare,
  Clock,
  AlertTriangle,
  Shield,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminEventDetail } from "@/lib/types";
import { getAdminEventDetail, adminCancelEvent } from "./actions";
import { CancelEventDialog } from "./cancel-event-dialog";

interface EventDetailSheetProps {
  eventId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionComplete: () => void;
}

export function EventDetailSheet({
  eventId,
  open,
  onOpenChange,
  onActionComplete,
}: EventDetailSheetProps) {
  const t = useTranslations("admin.events");

  const [detail, setDetail] = useState<AdminEventDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (open && eventId) {
      setLoading(true);
      setDetail(null);
      getAdminEventDetail(eventId).then((result) => {
        if (result.success) {
          setDetail(result.data);
        } else {
          toast.error(result.error);
        }
        setLoading(false);
      });
    }
  }, [open, eventId]);

  async function handleCancel(reason: string) {
    if (!eventId) return;
    setCancelling(true);
    const result = await adminCancelEvent(eventId, reason);
    setCancelling(false);

    if (result.success) {
      toast.success(t("cancelSuccess"));
      setCancelDialogOpen(false);
      onOpenChange(false);
      onActionComplete();
    } else {
      toast.error(result.error);
    }
  }

  function formatDateTime(iso: string, timezone?: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    });
  }

  const isCancelled = !!detail?.deleted_at;
  const isPast = detail ? new Date(detail.end_time) < new Date() : false;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{detail?.title ?? t("eventDetail")}</SheetTitle>
            <SheetDescription>
              {detail?.creator_name
                ? t("createdBy", { name: detail.creator_name })
                : detail?.creator_email ?? ""}
            </SheetDescription>
          </SheetHeader>

          {loading ? (
            <div className="mt-6 space-y-4 px-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : detail ? (
            <div className="mt-6 space-y-6 px-4 pb-6">
              {/* Status banner */}
              {isCancelled && detail.moderation_action && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
                  <div className="flex items-center gap-2 text-sm font-medium text-red-800 dark:text-red-400">
                    <AlertTriangle className="size-4" />
                    {t("cancelledByAdminBanner")}
                  </div>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                    <strong>{t("reason")}:</strong> {detail.moderation_action.reason}
                  </p>
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {t("cancelledByLabel", {
                      name: detail.moderation_action.admin_name ?? t("admin"),
                    })}{" "}
                    — {formatDateTime(detail.moderation_action.created_at)}
                  </p>
                </div>
              )}

              {isCancelled && !detail.moderation_action && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950/30">
                  <div className="flex items-center gap-2 text-sm font-medium text-yellow-800 dark:text-yellow-400">
                    <AlertTriangle className="size-4" />
                    {t("cancelledByHost")}
                  </div>
                </div>
              )}

              {/* Event info */}
              <section>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("sectionDetails")}
                </h3>
                <div className="space-y-2 text-sm">
                  {/* Date/time */}
                  <div className="flex items-start gap-2">
                    <Calendar className="mt-0.5 size-4 text-muted-foreground" />
                    <div>
                      <p>{formatDateTime(detail.start_time, detail.event_timezone)}</p>
                      <p className="text-muted-foreground">
                        {t("to")} {formatDateTime(detail.end_time, detail.event_timezone)}
                      </p>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-start gap-2">
                    {detail.location_type === "virtual" ? (
                      <Monitor className="mt-0.5 size-4 text-muted-foreground" />
                    ) : (
                      <MapPin className="mt-0.5 size-4 text-muted-foreground" />
                    )}
                    <div>
                      <p className="capitalize">{detail.location_type}</p>
                      {detail.address && (
                        <p className="text-muted-foreground">{detail.address}</p>
                      )}
                      {detail.virtual_url && (
                        <p className="text-muted-foreground truncate max-w-[300px]">
                          {detail.virtual_url}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Visibility */}
                  <div className="flex items-center gap-2">
                    {detail.is_public ? (
                      <Globe className="size-4 text-muted-foreground" />
                    ) : (
                      <Lock className="size-4 text-muted-foreground" />
                    )}
                    <span>{detail.is_public ? t("public") : t("private")}</span>
                  </div>

                  {/* Capacity */}
                  {detail.capacity && (
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-muted-foreground" />
                      <span>{t("capacity", { count: detail.capacity })}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Description */}
              {detail.description && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {t("sectionDescription")}
                  </h3>
                  <p className="text-sm whitespace-pre-wrap">{detail.description}</p>
                </section>
              )}

              <Separator />

              {/* RSVP stats */}
              <section>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("sectionAttendees")}
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatBox label={t("going")} value={detail.going_count} />
                  <StatBox label={t("maybe")} value={detail.maybe_count} />
                  <StatBox label={t("waitlist")} value={detail.waitlist_count} />
                  <StatBox label={t("cohosts")} value={detail.cohost_count} />
                </div>
                <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                  <MessageSquare className="size-3.5" />
                  <span>{t("commentsCount", { count: detail.comments_count })}</span>
                </div>
              </section>

              <Separator />

              {/* Moderation history */}
              {detail.moderation_history.length > 0 && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {t("sectionModerationHistory")}
                  </h3>
                  <div className="space-y-3">
                    {detail.moderation_history.map((action) => (
                      <div
                        key={action.id}
                        className="rounded-lg border p-3 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Shield className="size-3.5 text-muted-foreground" />
                          <span className="font-medium capitalize">{action.action}</span>
                          <span className="text-muted-foreground">
                            {t("by")} {action.admin_name ?? t("admin")}
                          </span>
                        </div>
                        <p className="mt-1 text-muted-foreground">{action.reason}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          <Clock className="mr-1 inline size-3" />
                          {formatDateTime(action.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <Separator />

              {/* Actions */}
              <section>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("sectionActions")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isCancelled}
                    onClick={() => setCancelDialogOpen(true)}
                  >
                    {isCancelled ? t("alreadyCancelled") : t("cancelEvent")}
                  </Button>
                </div>
                {isPast && !isCancelled && (
                  <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                    {t("pastEventWarning")}
                  </p>
                )}
              </section>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <CancelEventDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={handleCancel}
        loading={cancelling}
        eventTitle={detail?.title ?? ""}
        isSeries={!!detail?.series_id}
      />
    </>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-2 text-center">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
