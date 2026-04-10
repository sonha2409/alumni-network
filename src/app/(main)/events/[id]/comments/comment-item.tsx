"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/user-avatar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import type { EventCommentWithAuthor } from "@/lib/types";
import { deleteEventComment } from "./actions";
import { ReportCommentDialog } from "./report-comment-dialog";

interface Props {
  comment: EventCommentWithAuthor;
  currentUserId: string;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function CommentItem({ comment, currentUserId }: Props) {
  const [pending, startTransition] = useTransition();
  const [reportOpen, setReportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isOwn = comment.user_id === currentUserId;
  const isDeleted = comment.deleted_at !== null;

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteEventComment(comment.id);
      if (!result.success) {
        toast.error(result.error);
      }
      setDeleteOpen(false);
    });
  }

  return (
    <div className="flex gap-3">
      <UserAvatar
        photoUrl={isDeleted ? null : comment.author_photo_url}
        fullName={isDeleted ? "Deleted" : (comment.author_name ?? "User")}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium">
            {isDeleted ? (
              <span className="italic text-muted-foreground">[deleted]</span>
            ) : (
              comment.author_name ?? "Anonymous"
            )}
          </span>
          <span className="text-xs text-muted-foreground">
            {timeAgo(comment.created_at)}
          </span>
        </div>

        {isDeleted ? (
          <p className="mt-0.5 text-sm italic text-muted-foreground">
            This comment has been deleted.
          </p>
        ) : (
          <p className="mt-0.5 whitespace-pre-wrap text-sm">{comment.body}</p>
        )}

        {/* Actions */}
        {!isDeleted && (
          <div className="mt-1 flex gap-2">
            {isOwn && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-1 py-0 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
                disabled={pending}
              >
                Delete
              </Button>
            )}
            {!isOwn && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-1 py-0 text-xs text-muted-foreground"
                onClick={() => setReportOpen(true)}
              >
                Report
              </Button>
            )}
          </div>
        )}

        <ReportCommentDialog
          commentId={comment.id}
          open={reportOpen}
          onClose={() => setReportOpen(false)}
        />
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete comment"
          description="Are you sure you want to delete this comment? This cannot be undone."
          confirmLabel="Delete"
          variant="destructive"
          disabled={pending}
          onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}
