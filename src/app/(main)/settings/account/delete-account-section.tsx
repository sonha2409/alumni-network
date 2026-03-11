"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requestAccountDeletion } from "./actions";

interface DeleteAccountSectionProps {
  userEmail: string;
}

export function DeleteAccountSection({ userEmail }: DeleteAccountSectionProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleDelete() {
    setError(null);
    setFieldErrors({});
    setIsDeleting(true);

    try {
      const formData = new FormData();
      formData.set("password", password);
      if (reason.trim()) formData.set("reason", reason.trim());

      const result = await requestAccountDeletion(formData);

      if (!result.success) {
        setError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }

      // Deletion successful — redirect to login
      window.location.href = "/login";
    } finally {
      setIsDeleting(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setPassword("");
      setReason("");
      setError(null);
      setFieldErrors({});
    }
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <Trash2 className="mr-2 h-4 w-4" />
        Delete My Account
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            This will immediately:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>Hide your profile from the alumni directory</li>
            <li>Remove all your connections</li>
            <li>Remove you from all groups</li>
            <li>Sign you out</li>
          </ul>

          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              You have <strong>30 days</strong> to change your mind. After that,
              all your data will be permanently deleted and cannot be recovered.
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            We recommend{" "}
            <strong>exporting your data</strong> before proceeding.
          </p>

          <div className="space-y-2">
            <Label htmlFor="delete-password">
              Enter your password to confirm
            </Label>
            <Input
              id="delete-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your current password"
              aria-describedby={
                fieldErrors.password ? "delete-password-error" : undefined
              }
            />
            {fieldErrors.password && (
              <p
                id="delete-password-error"
                className="text-sm text-destructive"
              >
                {fieldErrors.password[0]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="delete-reason">
              Reason for leaving{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="delete-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Help us improve — why are you deleting your account?"
              rows={3}
              maxLength={500}
            />
          </div>

          {error && !fieldErrors.password && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={isDeleting}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || !password}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete My Account"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
