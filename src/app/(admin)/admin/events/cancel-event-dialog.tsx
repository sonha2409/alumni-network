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

interface CancelEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
  eventTitle: string;
  isSeries: boolean;
}

export function CancelEventDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
  eventTitle,
  isSeries,
}: CancelEventDialogProps) {
  const t = useTranslations("admin.events.cancelDialog");
  const tCommon = useTranslations("common");
  const [reason, setReason] = useState("");

  const trimmedReason = reason.trim();
  const isValid = trimmedReason.length >= 10 && trimmedReason.length <= 1000;

  function handleConfirm() {
    if (!isValid) return;
    onConfirm(trimmedReason);
  }

  function handleOpenChange(o: boolean) {
    if (!o) {
      setReason("");
    }
    onOpenChange(o);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description", { title: eventTitle })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-400">
            {t("warning")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancel-reason">{t("reasonLabel")}</Label>
            <Textarea
              id="cancel-reason"
              placeholder={t("reasonPlaceholder")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={1000}
              aria-describedby="cancel-reason-hint"
            />
            <p id="cancel-reason-hint" className="text-xs text-muted-foreground">
              {t("reasonHint", { current: trimmedReason.length, min: 10, max: 1000 })}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isValid || loading}
          >
            {loading ? t("cancelling") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
