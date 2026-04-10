"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { EventCommentWithAuthor } from "@/lib/types";
import { getEventComments, addEventComment } from "./actions";
import { CommentItem } from "./comment-item";

interface Props {
  eventId: string;
  currentUserId: string;
  isVerified: boolean;
  isMuted: boolean;
  initialComments: EventCommentWithAuthor[];
  initialTotalCount: number;
  initialTotalPages: number;
}

export function EventComments({
  eventId,
  currentUserId,
  isVerified,
  isMuted,
  initialComments,
  initialTotalCount,
  initialTotalPages,
}: Props) {
  const [comments, setComments] = useState(initialComments);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [page, setPage] = useState(1);
  const [body, setBody] = useState("");
  const [submitting, startSubmit] = useTransition();
  const [loadingMore, startLoadMore] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    startSubmit(async () => {
      const result = await addEventComment(eventId, body.trim());
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setComments((prev) => [...prev, result.data]);
      setTotalCount((n) => n + 1);
      setBody("");
    });
  }

  function handleLoadMore() {
    const nextPage = page + 1;
    startLoadMore(async () => {
      const result = await getEventComments(eventId, nextPage);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setComments((prev) => [...prev, ...result.data.comments]);
      setTotalCount(result.data.totalCount);
      setTotalPages(result.data.totalPages);
      setPage(nextPage);
    });
  }

  const hasMore = page < totalPages;

  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">
        Discussion ({totalCount})
      </h2>

      {/* Comment list */}
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No comments yet. Be the first to start the discussion.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="mt-4 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading..." : "Load more comments"}
          </Button>
        </div>
      )}

      {/* Add comment form */}
      {isVerified && !isMuted ? (
        <form onSubmit={handleSubmit} className="mt-4 border-t pt-4">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a comment..."
            rows={2}
            maxLength={2000}
            className="resize-none"
            disabled={submitting}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {body.length}/2000
            </span>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !body.trim()}
            >
              {submitting ? "Posting..." : "Post"}
            </Button>
          </div>
        </form>
      ) : isMuted ? (
        <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">
          Your account is temporarily restricted. You cannot post comments.
        </p>
      ) : (
        <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">
          You must be verified to comment.
        </p>
      )}
    </section>
  );
}
