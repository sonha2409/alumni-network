"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import type { ModerationReportRow } from "@/lib/types";
import { getReportQueue } from "../../actions";
import { ReportFilters } from "./report-filters";
import { ReportTable } from "./report-table";
import { ReportDetailSheet } from "./report-detail-sheet";

interface ReportsClientProps {
  role: "moderator" | "admin";
}

export function ReportsClient({ role }: ReportsClientProps) {
  const [reports, setReports] = useState<ModerationReportRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<string>("pending");
  const [selectedReport, setSelectedReport] = useState<ModerationReportRow | null>(null);
  const [isPending, startTransition] = useTransition();

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

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setPage(1);
  };

  const handleActionComplete = () => {
    setSelectedReport(null);
    fetchReports();
  };

  return (
    <div className="space-y-4">
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
    </div>
  );
}
