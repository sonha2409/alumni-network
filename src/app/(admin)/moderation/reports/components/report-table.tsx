"use client";

import { useTranslations } from "next-intl";
import type { ModerationReportRow } from "@/lib/types";

interface ReportTableProps {
  reports: ModerationReportRow[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSelectReport: (report: ModerationReportRow) => void;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    escalated: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    action_taken: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    dismissed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };

  const labels: Record<string, string> = {
    pending: "Pending",
    escalated: "Escalated",
    action_taken: "Actioned",
    dismissed: "Dismissed",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.pending}`}>
      {labels[status] ?? status}
    </span>
  );
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ReportTable({
  reports,
  isLoading,
  page,
  totalPages,
  onPageChange,
  onSelectReport,
}: ReportTableProps) {
  const t = useTranslations("moderation");
  const tCommon = useTranslations("common");

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg border bg-muted/50" />
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/20 py-12 text-center">
        <p className="text-muted-foreground">{t("noReports")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile card layout */}
      <div className="space-y-2 md:hidden">
        {reports.map((report) => (
          <button
            key={report.id}
            type="button"
            onClick={() => onSelectReport(report)}
            className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/30"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {report.reported_user_photo ? (
                  <img
                    src={report.reported_user_photo}
                    alt=""
                    className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {(report.reported_user_name ?? "?")[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {report.reported_user_name ?? "Unknown"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {report.reported_user_email}
                  </p>
                </div>
              </div>
              <StatusBadge status={report.status} />
            </div>
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
              {report.message_is_deleted ? (
                <span className="italic">{t("deletedMessage")}</span>
              ) : (
                report.message_content.slice(0, 120) +
                (report.message_content.length > 120 ? "..." : "")
              )}
            </p>
            <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{timeAgo(report.created_at)}</span>
              <span>{t("reports", { count: report.report_count })}</span>
              {report.warning_count > 0 && (
                <span className="text-yellow-600">{t("warnings", { count: report.warning_count })}</span>
              )}
              {report.reported_user_muted_until &&
                new Date(report.reported_user_muted_until) > new Date() && (
                  <span className="text-red-600">{t("muted")}</span>
                )}
            </div>
          </button>
        ))}
      </div>

      {/* Desktop table layout */}
      <div className="hidden overflow-hidden rounded-lg border md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("colReportedUser")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("colMessage")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("colReason")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("colStatus")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("colHistory")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("colReported")}</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr
                key={report.id}
                onClick={() => onSelectReport(report)}
                className="cursor-pointer border-b transition-colors hover:bg-muted/30 last:border-b-0"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {report.reported_user_photo ? (
                      <img
                        src={report.reported_user_photo}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {(report.reported_user_name ?? "?")[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium">
                        {report.reported_user_name ?? "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {report.reported_user_email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-muted-foreground">
                  {report.message_is_deleted ? (
                    <span className="italic">{t("deletedMessage")}</span>
                  ) : (
                    report.message_content.slice(0, 80) +
                    (report.message_content.length > 80 ? "..." : "")
                  )}
                </td>
                <td className="max-w-[150px] truncate px-4 py-3 text-muted-foreground">
                  {report.reason.slice(0, 60) +
                    (report.reason.length > 60 ? "..." : "")}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={report.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span title="Total reports">{t("reports", { count: report.report_count })}</span>
                    {report.warning_count > 0 && (
                      <span className="text-yellow-600" title="Prior warnings">
                        {t("warnings", { count: report.warning_count })}
                      </span>
                    )}
                    {report.reported_user_muted_until &&
                      new Date(report.reported_user_muted_until) > new Date() && (
                        <span className="text-red-600" title="Currently muted">
                          Muted
                        </span>
                      )}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {timeAgo(report.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {tCommon("previous")}
          </button>
          <span className="text-sm text-muted-foreground">
            {tCommon("page", { page, totalPages })}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {tCommon("next")}
          </button>
        </div>
      )}
    </div>
  );
}
