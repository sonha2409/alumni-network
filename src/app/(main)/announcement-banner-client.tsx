"use client";

import { useState, useTransition } from "react";
import { Megaphone, X, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

import { dismissAnnouncement } from "./announcements/actions";

interface AnnouncementBannerClientProps {
  id: string;
  title: string;
  body: string;
  link: string | null;
}

export function AnnouncementBannerClient({
  id,
  title,
  body,
  link,
}: AnnouncementBannerClientProps) {
  const t = useTranslations("banners");
  const [dismissed, setDismissed] = useState(false);
  const [, startTransition] = useTransition();

  if (dismissed) return null;

  function handleDismiss() {
    // Optimistic: hide immediately
    setDismissed(true);
    startTransition(async () => {
      const result = await dismissAnnouncement(id);
      if (!result.success) {
        // Revert on failure (unlikely)
        setDismissed(false);
      }
    });
  }

  return (
    <div
      role="status"
      className="border-b border-blue-300 bg-blue-50 px-4 py-3 dark:border-blue-700 dark:bg-blue-950"
    >
      <div className="mx-auto flex max-w-7xl items-start gap-3">
        <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {title}
          </p>
          <p className="mt-0.5 text-sm text-blue-800 dark:text-blue-200">
            {body}
          </p>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-blue-700 underline hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
            >
              {t("learnMore")}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded p-1 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900"
          aria-label={t("dismissAnnouncement")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
