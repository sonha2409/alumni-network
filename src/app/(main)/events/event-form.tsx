"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { buildUrlWithToast } from "@/lib/utils";
import type { EventRow, EventLocationType } from "@/lib/types";
import type { SeriesEditScope } from "./schemas";
import { createEvent, updateEvent } from "./actions";
import { createEventSeries, updateSeriesOccurrence } from "./series-actions";

export interface GroupOption {
  id: string;
  name: string;
}

interface Props {
  mode: "create" | "edit";
  initial?: EventRow;
  groups?: GroupOption[];
}

/**
 * Unified create/edit form for events.
 * Keeps the UI simple: native inputs with Tailwind styling, client-side
 * validation limited to basic required fields; Zod validation lives in the
 * server action.
 */
export function EventForm({ mode, initial, groups = [] }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [locationType, setLocationType] = useState<EventLocationType>(
    initial?.location_type ?? "physical"
  );
  const [isRecurring, setIsRecurring] = useState(false);
  const [editScope, setEditScope] = useState<SeriesEditScope | null>(null);

  const isSeries = Boolean(initial?.series_id);

  function toLocalDateTime(iso: string | undefined) {
    if (!iso) return "";
    const d = new Date(iso);
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // For series events in edit mode, require scope selection first
    if (mode === "edit" && isSeries && !editScope) {
      return;
    }

    const form = e.currentTarget;
    const fd = new FormData(form);

    const input = {
      title: String(fd.get("title") ?? ""),
      description: (fd.get("description") as string) || null,
      location_type: locationType,
      address: (fd.get("address") as string) || undefined,
      virtual_url: (fd.get("virtual_url") as string) || undefined,
      start_time: new Date(String(fd.get("start_time"))).toISOString(),
      end_time: new Date(String(fd.get("end_time"))).toISOString(),
      event_timezone:
        Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      is_public: fd.get("is_public") === "on",
      capacity: fd.get("capacity")
        ? Number(fd.get("capacity"))
        : null,
      cover_image_url: (fd.get("cover_image_url") as string) || null,
      group_id: (fd.get("group_id") as string) || null,
    };

    startTransition(async () => {
      let result;

      if (mode === "create" && isRecurring) {
        const seriesInput = {
          ...input,
          rrule: fd.get("rrule") as string,
          interval_val: Number(fd.get("interval_val") || 1),
          until_date: String(fd.get("until_date") ?? ""),
        };
        const seriesResult = await createEventSeries(seriesInput);
        if (!seriesResult.success) {
          toast.error(seriesResult.error);
          return;
        }
        router.push(buildUrlWithToast(
          `/events/${seriesResult.data.events[0].id}`,
          `Recurring event created (${seriesResult.data.events.length} occurrences)`
        ));
        router.refresh();
        return;
      }

      if (mode === "edit" && isSeries && editScope) {
        result = await updateSeriesOccurrence(initial!.id, editScope, input);
      } else if (mode === "create") {
        result = await createEvent(input);
      } else {
        result = await updateEvent(initial!.id, input);
      }

      if (!result.success) {
        toast.error(result.error);
        return;
      }
      router.push(buildUrlWithToast(
        `/events/${result.data.id}`,
        mode === "create" ? "Event created" : "Event updated"
      ));
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Title" required>
        <input
          name="title"
          defaultValue={initial?.title}
          minLength={3}
          maxLength={140}
          required
          className="rounded-md border bg-background px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Description">
        <textarea
          name="description"
          defaultValue={initial?.description ?? ""}
          maxLength={5000}
          rows={4}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Start" required>
          <input
            type="datetime-local"
            name="start_time"
            defaultValue={toLocalDateTime(initial?.start_time)}
            required
            className="rounded-md border bg-background px-3 py-2 text-sm"
          />
        </Field>
        <Field label="End" required>
          <input
            type="datetime-local"
            name="end_time"
            defaultValue={toLocalDateTime(initial?.end_time)}
            required
            className="rounded-md border bg-background px-3 py-2 text-sm"
          />
        </Field>
      </div>

      <Field label="Location type" required>
        <select
          name="location_type"
          value={locationType}
          onChange={(e) =>
            setLocationType(e.target.value as EventLocationType)
          }
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="physical">Physical</option>
          <option value="virtual">Virtual</option>
          <option value="hybrid">Hybrid</option>
        </select>
      </Field>

      {locationType !== "virtual" && (
        <Field label="Address" required>
          <input
            name="address"
            defaultValue={initial?.address ?? ""}
            maxLength={300}
            required
            className="rounded-md border bg-background px-3 py-2 text-sm"
          />
        </Field>
      )}

      {locationType !== "physical" && (
        <Field label="Meeting URL" required>
          <input
            type="url"
            name="virtual_url"
            defaultValue={initial?.virtual_url ?? ""}
            maxLength={500}
            required
            className="rounded-md border bg-background px-3 py-2 text-sm"
          />
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Capacity (blank = unlimited)">
          <input
            type="number"
            name="capacity"
            min={1}
            defaultValue={initial?.capacity ?? ""}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Cover image URL (optional)">
          <input
            type="url"
            name="cover_image_url"
            defaultValue={initial?.cover_image_url ?? ""}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_public"
          defaultChecked={initial?.is_public ?? true}
        />
        Public event (listed on /events)
      </label>

      {groups.length > 0 && (
        <Field label="Link to group (optional)">
          <select
            name="group_id"
            defaultValue={initial?.group_id ?? ""}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">None</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      {/* Recurring event toggle (create mode only) */}
      {mode === "create" && (
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
            />
            <span className="font-medium">Recurring event</span>
          </label>

          {isRecurring && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Repeats" required>
                <select
                  name="rrule"
                  defaultValue="weekly"
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </Field>
              <Field label="Every N weeks/months" required>
                <input
                  type="number"
                  name="interval_val"
                  min={1}
                  max={4}
                  defaultValue={1}
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Until" required>
                <input
                  type="date"
                  name="until_date"
                  required
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                />
              </Field>
            </div>
          )}
        </div>
      )}

      {/* Series edit scope selector (edit mode, series events only) */}
      {mode === "edit" && isSeries && (
        <div className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-medium">
            This event is part of a recurring series. Apply changes to:
          </p>
          <div className="flex flex-col gap-1.5">
            {(
              [
                { value: "this", label: "This occurrence only" },
                { value: "this_and_following", label: "This and all following occurrences" },
                { value: "all", label: "All future occurrences" },
              ] as const
            ).map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="edit_scope"
                  value={opt.value}
                  checked={editScope === opt.value}
                  onChange={() => setEditScope(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
          {!editScope && (
            <p className="text-xs text-destructive">
              Please select a scope before saving.
            </p>
          )}
        </div>
      )}

      {mode === "edit" && !isSeries && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          Editing the time, location, or address will reset RSVPs and require
          attendees to re-confirm.
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="submit"
          disabled={pending || (mode === "edit" && isSeries && !editScope)}
        >
          {pending
            ? "Saving…"
            : mode === "create"
              ? isRecurring
                ? "Create recurring event"
                : "Create event"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {children}
    </label>
  );
}
