"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { deleteCareerEntry } from "./career-actions";
import { CareerEntryForm } from "./career-entry-form";
import type { CareerEntry, IndustryWithSpecializations } from "@/lib/types";

interface CareerHistorySectionProps {
  entries: CareerEntry[];
  industries: IndustryWithSpecializations[];
}

export function CareerHistorySection({
  entries,
  industries,
}: CareerHistorySectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(entryId: string) {
    if (!confirm("Delete this career entry?")) return;
    startTransition(async () => {
      const result = await deleteCareerEntry(entryId);
      if (result.success) {
        toast.success("Career entry deleted.");
      } else {
        toast.error(result.error);
      }
    });
  }

  function formatDateRange(startDate: string, endDate: string | null, isCurrent: boolean): string {
    const start = new Date(startDate).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    if (isCurrent || !endDate) return `${start} — Present`;
    const end = new Date(endDate).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    return `${start} — ${end}`;
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Career history</h3>
        {!showAddForm && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(true)}
          >
            Add position
          </Button>
        )}
      </div>

      {showAddForm && (
        <CareerEntryForm
          industries={industries}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {entries.length === 0 && !showAddForm && (
        <p className="text-sm text-muted-foreground">
          No career entries yet. Add your work experience to strengthen your profile.
        </p>
      )}

      {entries.map((entry) => (
        <div key={entry.id}>
          {editingId === entry.id ? (
            <CareerEntryForm
              entry={entry}
              industries={industries}
              onClose={() => setEditingId(null)}
            />
          ) : (
            <div className="flex items-start justify-between rounded-lg border p-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{entry.job_title}</p>
                  {entry.is_current && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{entry.company}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateRange(entry.start_date, entry.end_date, entry.is_current)}
                </p>
                {entry.description && (
                  <p className="mt-2 text-sm">{entry.description}</p>
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
