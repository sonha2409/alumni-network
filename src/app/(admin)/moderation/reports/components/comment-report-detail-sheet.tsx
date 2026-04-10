"use client";

import { useState, useTransition } from "react";
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
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { CommentReportRow } from "@/lib/types";
import {
  dismissCommentReport,
  warnCommentUser,
  muteCommentUser,
  escalateCommentReport,
  deleteCommentAsModerator,
  unmuteUser,
} from "../../actions";
import { WarnDialog } from "./warn-dialog";
import { MuteDialog } from "./mute-dialog";
import { EscalateDialog } from "./escalate-dialog";

interface Props {
  report: CommentReportRow | null;
  open: boolean;
  onClose: () => void;
  onActionComplete: () => void;
  role: "moderator" | "admin";
}

export function CommentReportDetailSheet({
  report,
  open,
  onClose,
  onActionComplete,
  role,
}: Props) {
  const t = useTranslations("moderation");
  const [isPending, startTransition] = useTransition();
  const [warnOpen, setWarnOpen] = useState(false);
  const [muteOpen, setMuteOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [deleteCommentOpen, setDeleteCommentOpen] = useState(false);

  if (!report) return null;

  const isResolved = !["pending", "escalated"].includes(report.status);
  const canAct = !isResolved;
  const canResolveEscalated = report.status === "escalated" && role === "admin";
  const canTakeAction = canAct || canResolveEscalated;

  const handleDismiss = () => {
    startTransition(async () => {
      const result = await dismissCommentReport(report.id);
      if (result.success) {
        toast.success(t("dismissedToast"));
        onActionComplete();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleDeleteComment = () => {
    startTransition(async () => {
      const result = await deleteCommentAsModerator(report.comment_id, report.id);
      if (result.success) {
        toast.success("Comment deleted");
        setDeleteCommentOpen(false);
        onActionComplete();
      } else {
        toast.error(result.error);
        setDeleteCommentOpen(false);
      }
    });
  };

  const handleWarn = (reason: string) => {
    startTransition(async () => {
      const result = await warnCommentUser(report.id, reason);
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
      const result = await muteCommentUser(
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
      const result = await escalateCommentReport(report.id, notes);
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
            <SheetTitle>Comment Report</SheetTitle>
            <SheetDescription>
              Review this reported event comment.
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

                {/* Event context */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Event</p>
                  <p className="text-sm font-medium">{report.event_title}</p>
                </div>

                {/* Reported comment */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Reported comment</p>
                  <div className="rounded-lg border-l-4 border-red-400 bg-red-50/50 p-3 dark:bg-red-950/10">
                    <p className="text-sm">
                      {report.comment_is_deleted ? (
                        <span className="italic text-muted-foreground">[deleted]</span>
                      ) : (
                        report.comment_body
                      )}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(report.comment_created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                {/* Reason */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{t("reasonLabel")}</p>
                  <p className="text-sm leading-relaxed">{report.reason}</p>
                </div>

                {report.reviewer_notes && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">{t("reviewerNotes")}</p>
                    <p className="text-sm leading-relaxed italic">{report.reviewer_notes}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Actions */}
            <section className="space-y-3 pb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("actionsSection")}
              </h3>
              <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
                {/* Unmute button */}
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
                    {!report.comment_is_deleted && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
                        onClick={() => setDeleteCommentOpen(true)}
                        disabled={isPending}
                      >
                        Delete comment
                      </Button>
                    )}
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
      <ConfirmDialog
        open={deleteCommentOpen}
        onOpenChange={setDeleteCommentOpen}
        title="Delete comment"
        description="Are you sure you want to delete this comment? This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        disabled={isPending}
        onConfirm={handleDeleteComment}
      />
    </>
  );
}
