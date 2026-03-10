"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { NotificationType } from "@/lib/types";
import { updateNotificationPreference } from "./actions";

interface PreferenceConfig {
  type: NotificationType;
  label: string;
  description: string;
}

interface NotificationPreferencesFormProps {
  types: PreferenceConfig[];
  preferences: Record<NotificationType, boolean>;
}

export function NotificationPreferencesForm({
  types,
  preferences,
}: NotificationPreferencesFormProps) {
  const [localPrefs, setLocalPrefs] = useState(preferences);
  const [isPending, startTransition] = useTransition();

  function handleToggle(type: NotificationType, enabled: boolean) {
    // Optimistic update
    setLocalPrefs((prev) => ({ ...prev, [type]: enabled }));

    startTransition(async () => {
      const result = await updateNotificationPreference(type, enabled);
      if (!result.success) {
        // Revert on failure
        setLocalPrefs((prev) => ({ ...prev, [type]: !enabled }));
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-1">
      {types.map((config) => (
        <label
          key={config.type}
          className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
        >
          <div className="mr-4">
            <p className="text-sm font-medium">{config.label}</p>
            <p className="text-sm text-muted-foreground">
              {config.description}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={localPrefs[config.type]}
            aria-label={`${config.label} email notifications`}
            disabled={isPending}
            onClick={() =>
              handleToggle(config.type, !localPrefs[config.type])
            }
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
              localPrefs[config.type] ? "bg-primary" : "bg-input"
            }`}
          >
            <span
              className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                localPrefs[config.type] ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </label>
      ))}
    </div>
  );
}
