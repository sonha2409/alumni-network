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

interface WarnDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
  userName: string;
}

export function WarnDialog({ open, onClose, onConfirm, isPending, userName }: WarnDialogProps) {
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
          <DialogTitle>Warn User</DialogTitle>
          <DialogDescription>
            Send a warning to <strong>{userName}</strong>. They will receive a notification and email.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="warn-reason">Reason</Label>
          <Textarea
            id="warn-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain the reason for this warning..."
            rows={3}
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground">{reason.length}/1000</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending || reason.trim().length === 0}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {isPending ? "Sending..." : "Send Warning"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
