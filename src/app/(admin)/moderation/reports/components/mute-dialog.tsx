"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// DURATIONS moved inside component for i18n

interface MuteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (duration: "1d" | "7d" | "30d", reason: string) => void;
  isPending: boolean;
  userName: string;
}

export function MuteDialog({ open, onClose, onConfirm, isPending, userName }: MuteDialogProps) {
  const t = useTranslations("moderation.muteDialog");
  const tCommon = useTranslations("common");
  const [duration, setDuration] = useState<"1d" | "7d" | "30d">("1d");
  const [reason, setReason] = useState("");

  const DURATIONS = [
    { value: "1d" as const, label: t("day1") },
    { value: "7d" as const, label: t("day7") },
    { value: "30d" as const, label: t("day30") },
  ];

  const handleConfirm = () => {
    if (reason.trim().length === 0) return;
    onConfirm(duration, reason.trim());
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setReason("");
      setDuration("1d");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description", { name: userName })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("duration")}</Label>
            <div className="flex gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDuration(d.value)}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                    duration === d.value
                      ? "border-red-500 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/30 dark:text-red-400"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mute-reason">{t("reason")}</Label>
            <Textarea
              id="mute-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("placeholder")}
              rows={3}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">{t("charCount", { count: reason.length })}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending || reason.trim().length === 0}
            variant="destructive"
          >
            {isPending ? t("muting") : t("muteBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
