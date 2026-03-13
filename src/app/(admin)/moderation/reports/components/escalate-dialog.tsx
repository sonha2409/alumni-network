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

interface EscalateDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => void;
  isPending: boolean;
}

export function EscalateDialog({ open, onClose, onConfirm, isPending }: EscalateDialogProps) {
  const t = useTranslations("moderation.escalateDialog");
  const tCommon = useTranslations("common");
  const [notes, setNotes] = useState("");

  const handleConfirm = () => {
    if (notes.trim().length === 0) return;
    onConfirm(notes.trim());
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setNotes("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="escalate-notes">{t("notesLabel")}</Label>
          <Textarea
            id="escalate-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("placeholder")}
            rows={3}
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground">{t("charCount", { count: notes.length })}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending || notes.trim().length === 0}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isPending ? t("escalating") : t("escalateBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
