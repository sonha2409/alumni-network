"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { updateEventRadius } from "./actions";

const RADIUS_OPTIONS = [
  { value: null, label: "Off" },
  { value: 5, label: "5 km" },
  { value: 10, label: "10 km" },
  { value: 25, label: "25 km" },
  { value: 50, label: "50 km" },
  { value: 100, label: "100 km" },
  { value: 200, label: "200 km" },
  { value: 500, label: "500 km" },
] as const;

interface NearbyEventsRadiusFormProps {
  currentRadius: number | null;
}

export function NearbyEventsRadiusForm({
  currentRadius,
}: NearbyEventsRadiusFormProps) {
  const [radius, setRadius] = useState<number | null>(currentRadius);
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("settings");

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value === "" ? null : Number(e.target.value);
    const prev = radius;
    setRadius(val);

    startTransition(async () => {
      const result = await updateEventRadius(val);
      if (!result.success) {
        setRadius(prev);
        toast.error(result.error);
      } else {
        toast.success(t("radiusUpdated"));
      }
    });
  }

  return (
    <div className="rounded-lg border p-4">
      <label
        htmlFor="event-radius"
        className="block text-sm font-medium mb-1"
      >
        {t("radiusLabel")}
      </label>
      <p className="text-sm text-muted-foreground mb-3">
        {t("radiusHint")}
      </p>
      <select
        id="event-radius"
        value={radius === null ? "" : String(radius)}
        onChange={handleChange}
        disabled={isPending}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-48"
      >
        {RADIUS_OPTIONS.map((opt) => (
          <option key={opt.label} value={opt.value === null ? "" : String(opt.value)}>
            {opt.value === null ? t("radiusOff") : opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
