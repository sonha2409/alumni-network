"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import Image from "next/image";
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
import type {
  ModerationReportRow,
  ModerationContextMessage,
  UserWarning,
} from "@/lib/types";
import {
  getReportContext,
  dismissReport,
  warnUser,
  muteUser,
  escalateReport,
  unmuteUser,
} from "../../actions";
import { WarnDialog } from "./warn-dialog";
import { MuteDialog } from "./mute-dialog";
import { EscalateDialog } from "./escalate-dialog";

interface ReportDetailSheetProps {
  report: ModerationReportRow | null;
  open: boolean;
  onClose: () => void;
  onActionComplete: () => void;
  role: "moderator" | "admin";
}

export function ReportDetailSheet({
  report,
  open,
  onClose,
  onActionComplete,
  role,
}: ReportDetailSheetProps) {
  const t = useTranslations("moderation");
  const [messages, setMessages] = useState<ModerationContextMessage[]>([]);
  const [warnings, setWarnings] = useState<UserWarning[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [warnOpen, setWarnOpen] = useState(false);
  const [muteOpen, setMuteOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);

  useEffect(() => {
    if (!report) return;
    setLoading(true);
    getReportContext(report.id).then((result) => {
      if (result.success) {
        setMessages(result.data.messages);
        setWarnings(result.data.warnings);
      }
      setLoading(false);
    });
  }, [report]);

  if (!report) return null;

  const isResolved = !["pending", "escalated"].includes(report.status);
  const canAct = !isResolved;
  // Moderators can only resolve escalated reports if they're admin
  const canResolveEscalated = report.status === "escalated" && role === "admin";
  const canTakeAction = canAct || canResolveEscalated;

  const handleDismiss = () => {
    startTransition(async () => {
      const result = await dismissReport(report.id);
      if (result.success) {
        toast.success(t("dismissedToast"));
        onActionComplete();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleWarn = (reason: string) => {
    startTransition(async () => {
      const result = await warnUser(report.id, reason);
      if (result.success) {
        toast.success(t("warningIssuedToast"));
        setWarnOpen(false);
        onActionComplete();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleMute = (duration: "1d" | "7d" | "30d", reason: string) => {
    startTransition(async () => {
      const result = await muteUser(
        report.id,
        report.reported_user_id,
        duration,
        reason
      );
      if (result.success) {
        toast.success(t("mutedToast"));
        setMuteOpen(false);
        onActionComplete();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleUnmute = () => {
    startTransition(async () => {
      const result = await unmuteUser(report.reported_user_id);
      if (result.success) {
        toast.success(t("unmutedToast"));
        onActionComplete();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleEscalate = (notes: string) => {
    startTransition(async () => {
      const result = await escalateReport(report.id, notes);
      if (result.success) {
        toast.success(t("escalatedToast"));
        setEscalateOpen(false);
        onActionComplete();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{t("detailTitle")}</SheetTitle>
            <SheetDescription>
              {t("detailDesc")}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-5 px-1">
            {/* Report Info */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("reportSection")}
              </h3>
              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                {/* User info */}
                <div className="flex items-center gap-3">
                  {report.reported_user_photo ? (
                    <Image
                      src={report.reported_user_photo}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover ring-2 ring-muted"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                      {(report.reported_user_name ?? "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{report.reported_user_name ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground truncate">{report.reported_user_email}</p>
                  </div>
                  {/* Status badges */}
                  <div className="flex flex-col items-end gap-1">
                    {report.reported_user_muted_until &&
                      new Date(report.reported_user_muted_until) > new Date() && (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          Muted
                        </span>
                      )}
                    {report.warning_count > 0 && (
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                        {report.warning_count} warning{report.warning_count > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Reported message */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{t("reportedMessage")}</p>
                  <div className="rounded-lg border-l-4 border-red-400 bg-red-50/50 p-3 dark:bg-red-950/10">
                    <p className="text-sm">
                      {report.message_is_deleted ? (
                        <span className="italic text-muted-foreground">{t("messageDeleted")}</span>
                      ) : (
                        report.message_content
                      )}
                    </p>
                  </div>
                </div>

                {/* Reason */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{t("reasonLabel")}</p>
                  <p className="text-sm leading-relaxed">{report.reason}</p>
                </div>

                {/* Reviewer notes */}
                {report.reviewer_notes && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">{t("reviewerNotes")}</p>
                    <p className="text-sm leading-relaxed italic">{report.reviewer_notes}</p>
                  </div>
                )}

                {/* Stats row */}
                <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                    {report.report_count} report{report.report_count !== 1 ? "s" : ""}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                    {report.warning_count} warning{report.warning_count !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </section>

            {/* Conversation Context */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("conversationContext")}
              </h3>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="rounded-xl border bg-muted/10 py-8 text-center">
                  <p className="text-sm text-muted-foreground">{t("noMessagesFound")}</p>
                </div>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border bg-card p-4 shadow-sm">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-lg p-3 text-sm transition-colors ${
                        msg.is_reported
                          ? "border border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-950/20"
                          : "bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs">
                          {msg.sender_name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(msg.created_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                        {msg.is_reported && (
                          <span className="ml-auto inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                            {t("reported")}
                          </span>
                        )}
                      </div>
                      <p className={`mt-1 leading-relaxed ${msg.is_deleted ? "italic text-muted-foreground" : ""}`}>
                        {msg.is_deleted ? t("deletedMessage") : msg.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Prior Warnings */}
            {warnings.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("priorWarningsCount", { count: warnings.length })}
                </h3>
                <div className="space-y-2">
                  {warnings.map((w) => (
                    <div key={w.id} className="rounded-lg border border-yellow-200 bg-yellow-50/50 p-4 dark:border-yellow-800/50 dark:bg-yellow-950/10">
                      <p className="text-sm leading-relaxed">{w.reason}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        By {w.moderator_name ?? "Unknown"} &middot;{" "}
                        {new Date(w.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Actions */}
            <section className="space-y-3 pb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("actionsSection")}
              </h3>
              <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
                {/* Unmute button — always visible when user is muted */}
                {report.reported_user_muted_until &&
                  new Date(report.reported_user_muted_until) > new Date() && (
                    <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50/50 p-3 dark:border-green-800/50 dark:bg-green-950/10">
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">{t("userMuted")}</p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Until{" "}
                          {new Date(report.reported_user_muted_until).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-green-300 text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950/30"
                        onClick={handleUnmute}
                        disabled={isPending}
                      >
                        {isPending ? t("unmuting") : t("unmute")}
                      </Button>
                    </div>
                  )}

                {!canTakeAction ? (
                  <p className="text-sm text-muted-foreground py-1">
                    {t("resolved")}
                    {report.status === "escalated" && role === "moderator" && (
                      <> {t("escalatedToAdmin")}</>
                    )}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDismiss}
                      disabled={isPending}
                    >
                      {t("dismiss")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-yellow-300 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-700 dark:text-yellow-400 dark:hover:bg-yellow-950/30"
                      onClick={() => setWarnOpen(true)}
                      disabled={isPending}
                    >
                      {t("warnUser")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
                      onClick={() => setMuteOpen(true)}
                      disabled={isPending}
                    >
                      {t("muteUser")}
                    </Button>
                    {report.status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950/30"
                        onClick={() => setEscalateOpen(true)}
                        disabled={isPending}
                      >
                        {t("escalateToAdmin")}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        </SheetContent>
      </Sheet>

      <WarnDialog
        open={warnOpen}
        onClose={() => setWarnOpen(false)}
        onConfirm={handleWarn}
        isPending={isPending}
        userName={report.reported_user_name ?? "this user"}
      />
      <MuteDialog
        open={muteOpen}
        onClose={() => setMuteOpen(false)}
        onConfirm={handleMute}
        isPending={isPending}
        userName={report.reported_user_name ?? "this user"}
      />
      <EscalateDialog
        open={escalateOpen}
        onClose={() => setEscalateOpen(false)}
        onConfirm={handleEscalate}
        isPending={isPending}
      />
    </>
  );
}
