"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { deleteEducationEntry } from "./education-actions";
import { EducationEntryForm } from "./education-entry-form";
import type { EducationEntry } from "@/lib/types";

interface EducationHistorySectionProps {
  entries: EducationEntry[];
}

export function EducationHistorySection({
  entries,
}: EducationHistorySectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(entryId: string) {
    if (!confirm("Delete this education entry?")) return;
    startTransition(async () => {
      const result = await deleteEducationEntry(entryId);
      if (result.success) {
        toast.success("Education entry deleted.");
      } else {
        toast.error(result.error);
      }
    });
  }

  function formatYearRange(
    startYear: number | null,
    endYear: number | null
  ): string {
    if (startYear && endYear) return `${startYear} — ${endYear}`;
    if (startYear) return `${startYear} — Present`;
    if (endYear) return `${endYear}`;
    return "";
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Education</h3>
        {!showAddForm && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(true)}
          >
            Add education
          </Button>
        )}
      </div>

      {showAddForm && (
        <EducationEntryForm onClose={() => setShowAddForm(false)} />
      )}

      {entries.length === 0 && !showAddForm && (
        <p className="text-sm text-muted-foreground">
          No education entries yet. Add your educational background.
        </p>
      )}

      {entries.map((entry) => (
        <div key={entry.id}>
          {editingId === entry.id ? (
            <EducationEntryForm
              entry={entry}
              onClose={() => setEditingId(null)}
            />
          ) : (
            <div className="flex items-start justify-between rounded-lg border p-4">
              <div className="flex-1">
                <p className="font-medium">{entry.institution}</p>
                {(entry.degree || entry.field_of_study) && (
                  <p className="text-sm text-muted-foreground">
                    {[entry.degree, entry.field_of_study]
                      .filter(Boolean)
                      .join(" in ")}
                  </p>
                )}
                {(entry.start_year || entry.end_year) && (
                  <p className="text-xs text-muted-foreground">
                    {formatYearRange(entry.start_year, entry.end_year)}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingId(entry.id)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleDelete(entry.id)}
                  className="text-destructive hover:text-destructive"
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
