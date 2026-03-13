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
import { Input } from "@/components/ui/input";

interface UserActionDialogProps {
  action: "ban" | "suspend" | "delete" | null;
  userName: string;
  userEmail: string;
  onConfirm: (reason: string, days?: number) => void;
  onCancel: () => void;
  isProcessing: boolean;
}

export function UserActionDialog({
  action,
  userName,
  userEmail,
  onConfirm,
  onCancel,
  isProcessing,
}: UserActionDialogProps) {
  const t = useTranslations("admin.userAction");
  const tCommon = useTranslations("common");
  const [reason, setReason] = useState("");
  const [days, setDays] = useState(7);
  const [confirmEmail, setConfirmEmail] = useState("");

  const SUSPEND_DURATIONS = [
    { value: 1, label: t("day1") },
    { value: 7, label: t("day7") },
    { value: 30, label: t("day30") },
    { value: 90, label: t("day90") },
  ] as const;

  function handleClose() {
    setReason("");
    setDays(7);
    setConfirmEmail("");
    onCancel();
  }

  function handleConfirm() {
    if (action === "delete" && confirmEmail !== userEmail) return;
    onConfirm(reason, action === "suspend" ? days : undefined);
  }

  const isDeleteConfirmed = action !== "delete" || confirmEmail === userEmail;

  const titles: Record<string, string> = {
    ban: t("banTitle", { name: userName }),
    suspend: t("suspendTitle", { name: userName }),
    delete: t("deleteTitle", { name: userName }),
  };

  const descriptions: Record<string, string> = {
    ban: t("banDesc"),
    suspend: t("suspendDesc"),
    delete: t("deleteDesc"),
  };

  if (!action) return null;

  return (
    <Dialog open={!!action} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titles[action]}</DialogTitle>
          <DialogDescription>{descriptions[action]}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Suspend: duration picker */}
          {action === "suspend" && (
            <div className="space-y-2">
              <Label htmlFor="suspend_duration">{t("duration")}</Label>
              <select
                id="suspend_duration"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
              >
                {SUSPEND_DURATIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Ban/Suspend: reason */}
          {(action === "ban" || action === "suspend") && (
            <div className="space-y-2">
              <Label htmlFor="action_reason">{t("reason")}</Label>
              <Textarea
                id="action_reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("reasonPlaceholder")}
                rows={3}
                maxLength={500}
              />
            </div>
          )}

          {/* Delete: email confirmation */}
          {action === "delete" && (
            <div className="space-y-2">
              <Label htmlFor="confirm_email">
                {t("typeToConfirm", { email: userEmail })}
              </Label>
              <Input
                id="confirm_email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={userEmail}
                autoComplete="off"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            {tCommon("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isProcessing || !isDeleteConfirmed}
          >
            {isProcessing
              ? tCommon("processing")
              : action === "ban"
                ? t("banUser")
                : action === "suspend"
                  ? t("suspendFor", { days })
                  : t("deleteAccountBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
