"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { sendMessage } from "../actions";
import { useMessages } from "./messages-provider";
import type { MessageWithSender } from "@/lib/types";

interface MessageInputProps {
  conversationId: string;
  currentUserId: string;
}

export function MessageInput({
  conversationId,
  currentUserId,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitWarning, setRateLimitWarning] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { addOptimisticMessage, updateConversation } = useMessages();

  async function handleSend() {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    setError(null);
    setIsSending(true);

    // Optimistic update — add message immediately
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: MessageWithSender = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: trimmed,
      is_edited: false,
      edited_at: null,
      is_deleted: false,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sender: {
        user_id: currentUserId,
        full_name: "You",
        photo_url: null,
      },
    };

    addOptimisticMessage(optimisticMessage);
    setContent("");

    // Reset textarea height and keep focus
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }

    const result = await sendMessage(conversationId, trimmed);
    setIsSending(false);

    if (!result.success) {
      setError(result.error);
      setContent(trimmed);
    } else {
      // Update conversation preview
      const preview =
        trimmed.length > 100 ? trimmed.slice(0, 100) + "..." : trimmed;
      updateConversation({
        id: conversationId,
        last_message_at: result.data.message.created_at,
        last_message_preview: preview,
      });

      // Show rate limit warning if getting close
      const { rateLimitInfo } = result.data;
      if (rateLimitInfo.remaining <= 5 && rateLimitInfo.remaining > 0) {
        setRateLimitWarning(
          `${rateLimitInfo.remaining} messages remaining today`
        );
      } else if (rateLimitInfo.remaining === 0) {
        setRateLimitWarning("Daily message limit reached");
      } else {
        setRateLimitWarning(null);
      }
    }

    // Always refocus after server response
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value);
    setError(null);

    // Auto-resize
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }

  return (
    <div className="border-t px-4 py-3">
      {rateLimitWarning && (
        <div className="mb-2 rounded-md bg-yellow-50 px-3 py-1.5 text-xs text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
          {rateLimitWarning}
        </div>
      )}
      {error && (
        <div
          className="mb-2 rounded-md bg-destructive/10 px-3 py-1.5 text-xs text-destructive"
          role="alert"
        >
          {error}
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="max-h-40 min-h-[40px] flex-1 resize-none rounded-xl border bg-muted/50 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          rows={1}
          maxLength={5000}
          aria-label="Message input"
          autoFocus
        />
        <Button
          onClick={handleSend}
          disabled={!content.trim() || isSending}
          size="icon"
          className="h-10 w-10 flex-shrink-0 rounded-full"
          aria-label="Send message"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
            />
          </svg>
        </Button>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
