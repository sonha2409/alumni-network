"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatMessageTime } from "@/lib/utils";
import type { MessageWithSender } from "@/lib/types";
import { editMessage, deleteMessage } from "../actions";
import { useMessages } from "./messages-provider";
import { ReportDialog } from "./report-dialog";
import { AttachmentPreview } from "./attachment-preview";

interface MessageBubbleProps {
  message: MessageWithSender;
  isOwn: boolean;
  showAvatar: boolean;
  /** Whether to show the group timestamp (first message in a <5min cluster) */
  showGroupTimestamp: boolean;
}

export function MessageBubble({
  message,
  isOwn,
  showAvatar,
  showGroupTimestamp,
}: MessageBubbleProps) {
  const t = useTranslations("messages");
  const tc = useTranslations("common");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [showTimestamp, setShowTimestamp] = useState(false);
  const { updateMessage } = useMessages();

  const canEdit =
    isOwn &&
    !message.is_deleted &&
    new Date().getTime() - new Date(message.created_at).getTime() <
      15 * 60 * 1000;

  const canDelete = isOwn && !message.is_deleted;

  async function handleEdit() {
    if (!editContent.trim() || editContent.trim() === message.content) {
      setIsEditing(false);
      return;
    }

    setIsSubmitting(true);
    const result = await editMessage(message.id, editContent.trim());
    setIsSubmitting(false);

    if (result.success) {
      updateMessage(message.id, {
        content: editContent.trim(),
        is_edited: true,
        edited_at: new Date().toISOString(),
      });
      setIsEditing(false);
    }
  }

  async function handleDelete() {
    setIsSubmitting(true);
    const result = await deleteMessage(message.id);
    setIsSubmitting(false);

    if (result.success) {
      updateMessage(message.id, {
        is_deleted: true,
        content: "",
      });
    }
  }

  if (message.is_deleted) {
    return (
      <div
        className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
      >
        {showAvatar && !isOwn ? (
          <Avatar sender={message.sender} />
        ) : (
          <div className="w-8" />
        )}
        <div className="rounded-2xl bg-muted/50 px-4 py-2">
          <p className="text-xs italic text-muted-foreground">
            {t("deleted")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Group timestamp — shown for first message in a time cluster */}
      {showGroupTimestamp && (
        <div className="flex justify-center py-2">
          <span className="text-[11px] text-muted-foreground">
            {formatMessageTime(message.created_at)}
          </span>
        </div>
      )}

      <div
        className={`group flex items-end gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
      >
        {showAvatar && !isOwn ? (
          <Avatar sender={message.sender} />
        ) : (
          <div className="w-8" />
        )}

        <div className="flex max-w-[85%] flex-col sm:max-w-[70%]">
          {isEditing ? (
            <div className="flex flex-col gap-1">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[60px] w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleEdit();
                  }
                  if (e.key === "Escape") {
                    setIsEditing(false);
                    setEditContent(message.content);
                  }
                }}
                disabled={isSubmitting}
                autoFocus
              />
              <div className="flex gap-1 text-xs">
                <button
                  onClick={handleEdit}
                  disabled={isSubmitting}
                  className="rounded px-2 py-0.5 text-primary hover:bg-muted"
                >
                  {tc("save")}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(message.content);
                  }}
                  className="rounded px-2 py-0.5 text-muted-foreground hover:bg-muted"
                >
                  {tc("cancel")}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <button
                type="button"
                className="cursor-pointer text-left"
                onClick={() => setShowTimestamp((prev) => !prev)}
                aria-label={t("toggleTimestamp")}
              >
                <div
                  className={`rounded-2xl px-4 py-2 ${
                    isOwn
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.content && (
                    <p className="whitespace-pre-wrap break-words text-sm">
                      {message.content}
                    </p>
                  )}
                </div>
              </button>
              {message.attachments && message.attachments.length > 0 && (
                <AttachmentPreview
                  attachments={message.attachments}
                  isOwn={isOwn}
                />
              )}
            </div>
          )}

          {/* Per-message timestamp — shown on tap/click */}
          {showTimestamp && !showGroupTimestamp && (
            <div
              className={`mt-0.5 flex items-center gap-1 animate-in fade-in-0 slide-in-from-bottom-1 duration-150 ${
                isOwn ? "flex-row-reverse" : ""
              }`}
            >
              <span className="text-[10px] text-muted-foreground">
                {formatMessageTime(message.created_at)}
              </span>
              {message.is_edited && (
                <span className="text-[10px] text-muted-foreground">{t("edited")}</span>
              )}
            </div>
          )}

          {/* Always show edited indicator with group timestamp */}
          {showGroupTimestamp && message.is_edited && (
            <div
              className={`mt-0.5 flex items-center ${
                isOwn ? "justify-end" : ""
              }`}
            >
              <span className="text-[10px] text-muted-foreground">{t("edited")}</span>
            </div>
          )}
        </div>

        {/* Action menu */}
        {!isEditing && (
          <div className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="rounded-md p-1 hover:bg-muted"
                aria-label={t("messageActions")}
              >
                <svg
                  className="h-4 w-4 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
                  />
                </svg>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isOwn ? "end" : "start"}>
                {canEdit && (
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    {tc("edit")}
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive"
                  >
                    {tc("delete")}
                  </DropdownMenuItem>
                )}
                {(canEdit || canDelete) && !isOwn && <DropdownMenuSeparator />}
                {!isOwn && (
                  <DropdownMenuItem
                    onClick={() => setReportOpen(true)}
                    className="text-destructive"
                  >
                    {t("report")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {reportOpen && (
        <ReportDialog
          messageId={message.id}
          open={reportOpen}
          onClose={() => setReportOpen(false)}
        />
      )}
    </>
  );
}

function Avatar({
  sender,
}: {
  sender: { full_name: string; photo_url: string | null };
}) {
  const initials = sender.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (sender.photo_url) {
    return (
      <img
        src={sender.photo_url}
        alt={sender.full_name}
        className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
      {initials}
    </div>
  );
}
