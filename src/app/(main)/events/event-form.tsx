"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { EventRow, EventLocationType } from "@/lib/types";
import { createEvent, updateEvent } from "./actions";

interface Props {
  mode: "create" | "edit";
  initial?: EventRow;
}

/**
 * Unified create/edit form for events.
 * Keeps the UI simple: native inputs with Tailwind styling, client-side
 * validation limited to basic required fields; Zod validation lives in the
 * server action.
 */
export function EventForm({ mode, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [locationType, setLocationType] = useState<EventLocationType>(
    initial?.location_type ?? "physical"
  );

  function toLocalDateTime(iso: string | undefined) {
    if (!iso) return "";
    const d = new Date(iso);
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createEvent(input)
          : await updateEvent(initial!.id, input);

      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(mode === "create" ? "Event created" : "Event updated");
      router.push(`/events/${result.data.id}`);
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

      {mode === "edit" && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          Editing the time, location, or address will reset RSVPs and require
          attendees to re-confirm.
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Create event"
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
