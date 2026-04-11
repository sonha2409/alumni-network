"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cancelEvent } from "../actions";
import { cancelSeriesOccurrence } from "../series-actions";
import type { SeriesCancelScope } from "../schemas";

interface Props {
  eventId: string;
  showCheckin: boolean;
  seriesId?: string | null;
}

export function HostActions({ eventId, showCheckin, seriesId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [seriesCancelScope, setSeriesCancelScope] =
    useState<SeriesCancelScope>("this");

  const isSeries = Boolean(seriesId);

  function handleCancel() {
    startTransition(async () => {
      let result;

      if (isSeries) {
        result = await cancelSeriesOccurrence(eventId, seriesCancelScope);
      } else {
        result = await cancelEvent(eventId);
      }

      if (!result.success) {
        toast.error(result.error);
        setCancelOpen(false);
        return;
      }

      toast.success(
        isSeries && seriesCancelScope === "all_future"
          ? "All future occurrences cancelled"
          : "Event cancelled"
      );
      router.push("/events");
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap gap-2">
        {showCheckin && (
          <Link
            href={`/events/${eventId}/host`}
            className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Check-in
          </Link>
        )}
        <Link
          href={`/events/${eventId}/edit`}
          className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent"
        >
          Edit
        </Link>
        <Button
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={() => setCancelOpen(true)}
        >
          {isSeries ? "Cancel..." : "Cancel event"}
        </Button>
      </div>

      {/* Series cancel scope dialog */}
      {isSeries ? (
        <ConfirmDialog
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          title="Cancel recurring event"
          description=""
          confirmLabel={
            seriesCancelScope === "this"
              ? "Cancel this occurrence"
              : "Cancel all future"
          }
          variant="destructive"
          disabled={pending}
          onConfirm={handleCancel}
        >
          <div className="flex flex-col gap-2 py-2">
            <p className="text-sm text-muted-foreground">
              This event is part of a recurring series. What would you like to
              cancel?
            </p>
            {(
              [
                { value: "this", label: "This occurrence only" },
                { value: "all_future", label: "All future occurrences" },
              ] as const
            ).map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="radio"
                  name="cancel_scope"
                  value={opt.value}
                  checked={seriesCancelScope === opt.value}
                  onChange={() => setSeriesCancelScope(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </ConfirmDialog>
      ) : (
        <ConfirmDialog
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          title="Cancel event"
          description="Are you sure you want to cancel this event? All attendees will be notified."
          confirmLabel="Cancel event"
          variant="destructive"
          disabled={pending}
          onConfirm={handleCancel}
        />
      )}
    </section>
  );
}
