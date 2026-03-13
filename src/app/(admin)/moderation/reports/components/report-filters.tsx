"use client";

import { useTranslations } from "next-intl";

interface ReportFiltersProps {
  status: string;
  onStatusChange: (status: string) => void;
  totalCount: number;
}

export function ReportFilters({ status, onStatusChange, totalCount }: ReportFiltersProps) {
  const t = useTranslations("moderation");

  const STATUSES = [
    { value: "pending", label: t("filterPending") },
    { value: "escalated", label: t("filterEscalated") },
    { value: "action_taken", label: t("filterActioned") },
    { value: "dismissed", label: t("filterDismissed") },
    { value: "all", label: t("filterAll") },
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/50 p-1">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => onStatusChange(s.value)}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
              status === s.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {t("reportCount", { count: totalCount })}
      </p>
    </div>
  );
}
