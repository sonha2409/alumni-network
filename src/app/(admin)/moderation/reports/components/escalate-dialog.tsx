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

interface EscalateDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => void;
  isPending: boolean;
}

export function EscalateDialog({ open, onClose, onConfirm, isPending }: EscalateDialogProps) {
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
          <DialogTitle>Escalate to Admin</DialogTitle>
          <DialogDescription>
            Flag this report for admin review. Provide context for why it needs escalation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="escalate-notes">Notes for admin</Label>
          <Textarea
            id="escalate-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Why does this need admin attention? (e.g., potential ban-worthy offense, repeat offender...)"
            rows={3}
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground">{notes.length}/1000</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending || notes.trim().length === 0}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isPending ? "Escalating..." : "Escalate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
