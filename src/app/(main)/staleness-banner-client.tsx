"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, X } from "lucide-react";

import {
  snoozeStalenessBanner,
  confirmProfileCurrent,
} from "./staleness-actions";

interface StalenessBannerClientProps {
  timeAgoText: string;
}

export function StalenessBannerClient({
  timeAgoText,
}: StalenessBannerClientProps) {
  const [dismissed, setDismissed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (dismissed) return null;

  function handleSnooze() {
    setDismissed(true);
    startTransition(async () => {
      const result = await snoozeStalenessBanner();
      if (!result.success) {
        setDismissed(false);
      }
    });
  }

  function handleConfirmCurrent() {
    setDismissed(true);
    startTransition(async () => {
      const result = await confirmProfileCurrent();
      if (!result.success) {
        setDismissed(false);
      }
    });
  }

  return (
    <div
      role="status"
      className="border-b border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950"
    >
      <div className="mx-auto flex max-w-7xl items-start gap-3">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Your profile was last updated {timeAgoText} ago. Is it still
            accurate?
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => router.push("/settings/quick-update")}
              disabled={isPending}
              className="rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50 dark:bg-amber-500 dark:hover:bg-amber-600"
            >
              Update Now
            </button>
            <button
              onClick={handleConfirmCurrent}
              disabled={isPending}
              className="rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-600 dark:bg-amber-900 dark:text-amber-200 dark:hover:bg-amber-800"
            >
              Still Accurate
            </button>
            <button
              onClick={handleSnooze}
              disabled={isPending}
              className="px-3 py-1 text-xs font-medium text-amber-600 underline hover:text-amber-800 disabled:opacity-50 dark:text-amber-400 dark:hover:text-amber-200"
            >
              Remind Me Later
            </button>
          </div>
        </div>
        <button
          onClick={handleSnooze}
          disabled={isPending}
          className="shrink-0 rounded p-1 text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900"
          aria-label="Dismiss profile update reminder"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
