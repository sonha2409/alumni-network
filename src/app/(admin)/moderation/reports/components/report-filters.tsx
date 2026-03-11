"use client";

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "escalated", label: "Escalated" },
  { value: "action_taken", label: "Actioned" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All" },
];

interface ReportFiltersProps {
  status: string;
  onStatusChange: (status: string) => void;
  totalCount: number;
}

export function ReportFilters({ status, onStatusChange, totalCount }: ReportFiltersProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex gap-1 rounded-lg border bg-muted/50 p-1">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => onStatusChange(s.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
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
        {totalCount} report{totalCount !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
