"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { reportEventComment } from "./actions";

interface Props {
  commentId: string;
  open: boolean;
  onClose: () => void;
}

export function ReportCommentDialog({ commentId, open, onClose }: Props) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await reportEventComment(commentId, reason);
    setIsSubmitting(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setReason("");
      }, 1500);
    } else {
      setError(result.error);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Report comment"
    >
      <div className="mx-4 w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
        {success ? (
          <div className="text-center">
            <svg
              className="mx-auto mb-3 h-10 w-10 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            <p className="text-sm font-medium">Report submitted</p>
            <p className="mt-1 text-xs text-muted-foreground">
              A moderator will review this comment.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3 className="text-lg font-semibold">Report comment</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Please describe why this comment is inappropriate.
            </p>

            <div className="mt-4">
              <Label htmlFor="comment-report-reason">Reason</Label>
              <Textarea
                id="comment-report-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the issue..."
                className="mt-1.5"
                rows={3}
                maxLength={1000}
                required
                minLength={10}
                aria-describedby={error ? "comment-report-error" : undefined}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {reason.length}/1000
              </p>
            </div>

            {error && (
              <p
                id="comment-report-error"
                className="mt-2 text-sm text-destructive"
                role="alert"
              >
                {error}
              </p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || reason.length < 10}
              >
                {isSubmitting ? "Submitting..." : "Submit report"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
