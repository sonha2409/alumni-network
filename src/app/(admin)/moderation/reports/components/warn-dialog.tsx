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

interface WarnDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
  userName: string;
}

export function WarnDialog({ open, onClose, onConfirm, isPending, userName }: WarnDialogProps) {
  const t = useTranslations("moderation.warnDialog");
  const tCommon = useTranslations("common");
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (reason.trim().length === 0) return;
    onConfirm(reason.trim());
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setReason("");
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
        <div className="space-y-2">
          <Label htmlFor="warn-reason">{t("reason")}</Label>
          <Textarea
            id="warn-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("placeholder")}
            rows={3}
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground">{t("charCount", { count: reason.length })}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending || reason.trim().length === 0}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {isPending ? t("sending") : t("sendWarning")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
