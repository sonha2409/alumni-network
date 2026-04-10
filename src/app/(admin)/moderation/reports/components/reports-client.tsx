"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import type { ModerationReportRow, CommentReportRow } from "@/lib/types";
import { getReportQueue, getCommentReportQueue } from "../../actions";
import { ReportFilters } from "./report-filters";
import { ReportTable } from "./report-table";
import { ReportDetailSheet } from "./report-detail-sheet";
import { CommentReportTable } from "./comment-report-table";
import { CommentReportDetailSheet } from "./comment-report-detail-sheet";

type ReportTab = "messages" | "comments";

interface ReportsClientProps {
  role: "moderator" | "admin";
}

export function ReportsClient({ role }: ReportsClientProps) {
  const [tab, setTab] = useState<ReportTab>("messages");

  // Message reports state
  const [reports, setReports] = useState<ModerationReportRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<string>("pending");
  const [selectedReport, setSelectedReport] = useState<ModerationReportRow | null>(null);
  const [isPending, startTransition] = useTransition();

  // Comment reports state
  const [commentReports, setCommentReports] = useState<CommentReportRow[]>([]);
  const [commentTotalCount, setCommentTotalCount] = useState(0);
  const [commentPage, setCommentPage] = useState(1);
  const [commentTotalPages, setCommentTotalPages] = useState(1);
  const [commentStatus, setCommentStatus] = useState<string>("pending");
  const [selectedCommentReport, setSelectedCommentReport] = useState<CommentReportRow | null>(null);
  const [isCommentPending, startCommentTransition] = useTransition();

  const fetchReports = useCallback(() => {
    startTransition(async () => {
      const result = await getReportQueue({
        status: status as "pending" | "reviewed" | "action_taken" | "dismissed" | "escalated" | "all",
        page,
        pageSize: 20,
      });

      if (result.success) {
        setReports(result.data.reports);
        setTotalCount(result.data.totalCount);
        setTotalPages(result.data.totalPages);
      } else {
        toast.error(result.error);
      }
    });
  }, [status, page]);

  const fetchCommentReports = useCallback(() => {
    startCommentTransition(async () => {
      const result = await getCommentReportQueue({
        status: commentStatus as "pending" | "reviewed" | "action_taken" | "dismissed" | "escalated" | "all",
        page: commentPage,
        pageSize: 20,
      });

      if (result.success) {
        setCommentReports(result.data.reports);
        setCommentTotalCount(result.data.totalCount);
        setCommentTotalPages(result.data.totalPages);
      } else {
        toast.error(result.error);
      }
    });
  }, [commentStatus, commentPage]);

  useEffect(() => {
    if (tab === "messages") fetchReports();
  }, [fetchReports, tab]);

  useEffect(() => {
    if (tab === "comments") fetchCommentReports();
  }, [fetchCommentReports, tab]);

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setPage(1);
  };

  const handleCommentStatusChange = (newStatus: string) => {
    setCommentStatus(newStatus);
    setCommentPage(1);
  };

  const handleActionComplete = () => {
    setSelectedReport(null);
    fetchReports();
  };

  const handleCommentActionComplete = () => {
    setSelectedCommentReport(null);
    fetchCommentReports();
  };

  return (
    <div className="space-y-4">
      {/* Tab toggle */}
      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
        <button
          type="button"
          onClick={() => setTab("messages")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === "messages"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Messages
        </button>
        <button
          type="button"
          onClick={() => setTab("comments")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === "comments"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Comments
        </button>
      </div>

      {tab === "messages" ? (
        <>
          <ReportFilters
            status={status}
            onStatusChange={handleStatusChange}
            totalCount={totalCount}
          />
          <ReportTable
            reports={reports}
            isLoading={isPending}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            onSelectReport={setSelectedReport}
          />
          <ReportDetailSheet
            report={selectedReport}
            open={selectedReport !== null}
            onClose={() => setSelectedReport(null)}
            onActionComplete={handleActionComplete}
            role={role}
          />
        </>
      ) : (
        <>
          <ReportFilters
            status={commentStatus}
            onStatusChange={handleCommentStatusChange}
            totalCount={commentTotalCount}
          />
          <CommentReportTable
            reports={commentReports}
            isLoading={isCommentPending}
            page={commentPage}
            totalPages={commentTotalPages}
            onPageChange={setCommentPage}
            onSelectReport={setSelectedCommentReport}
          />
          <CommentReportDetailSheet
            report={selectedCommentReport}
            open={selectedCommentReport !== null}
            onClose={() => setSelectedCommentReport(null)}
            onActionComplete={handleCommentActionComplete}
            role={role}
          />
        </>
      )}
    </div>
  );
}
