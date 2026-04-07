"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateShowLastActive } from "./actions";

interface PrivacyToggleProps {
  initialShowLastActive: boolean;
}

export function PrivacyToggle({ initialShowLastActive }: PrivacyToggleProps) {
  const t = useTranslations("settings");
  const [value, setValue] = useState(initialShowLastActive);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const next = !value;
    // Optimistic flip — revert on failure.
    setValue(next);
    startTransition(async () => {
      const result = await updateShowLastActive(next);
      if (result.success) {
        toast.success(t("privacyUpdated"));
      } else {
        setValue(!next);
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-1">
      <label className="flex items-start justify-between gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50">
        <div className="flex-1">
          <p className="text-sm font-medium">{t("showLastActiveLabel")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("showLastActiveDesc")}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={value}
          aria-label={t("showLastActiveLabel")}
          disabled={isPending}
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
            value ? "bg-primary" : "bg-input"
          }`}
        >
          <span
            className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
              value ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </label>
    </div>
  );
}
