"use client";

import { useState } from "react";

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

const SUSPEND_DURATIONS = [
  { value: 1, label: "1 day" },
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
] as const;

export function UserActionDialog({
  action,
  userName,
  userEmail,
  onConfirm,
  onCancel,
  isProcessing,
}: UserActionDialogProps) {
  const [reason, setReason] = useState("");
  const [days, setDays] = useState(7);
  const [confirmEmail, setConfirmEmail] = useState("");

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
    ban: `Ban ${userName}`,
    suspend: `Suspend ${userName}`,
    delete: `Delete ${userName}'s Account`,
  };

  const descriptions: Record<string, string> = {
    ban: "This will permanently ban the user. They will not be able to access the platform.",
    suspend: "This will temporarily suspend the user for a specified duration.",
    delete: "This will soft-delete the user's account. This action can be reversed within 30 days.",
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
              <Label htmlFor="suspend_duration">Duration</Label>
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
              <Label htmlFor="action_reason">Reason</Label>
              <Textarea
                id="action_reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide a reason for this action..."
                rows={3}
                maxLength={500}
              />
            </div>
          )}

          {/* Delete: email confirmation */}
          {action === "delete" && (
            <div className="space-y-2">
              <Label htmlFor="confirm_email">
                Type <span className="font-mono font-bold">{userEmail}</span> to confirm
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
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isProcessing || !isDeleteConfirmed}
          >
            {isProcessing
              ? "Processing..."
              : action === "ban"
                ? "Ban User"
                : action === "suspend"
                  ? `Suspend for ${days} day${days !== 1 ? "s" : ""}`
                  : "Delete Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
