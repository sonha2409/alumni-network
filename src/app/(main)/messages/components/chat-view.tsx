"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useMessages } from "./messages-provider";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { markConversationRead } from "../actions";
import { Skeleton } from "@/components/ui/skeleton";
import type { ConversationWithDetails } from "@/lib/types";

const FIVE_MINUTES_MS = 5 * 60 * 1000;

interface ChatViewProps {
  conversationId: string;
  currentUserId: string;
  conversation: ConversationWithDetails;
}

export function ChatView({
  conversationId,
  currentUserId,
  conversation,
}: ChatViewProps) {
  const {
    activeMessages,
    setActiveConversation,
    hasMoreMessages,
    loadOlderMessages,
  } = useMessages();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const prevMessageCountRef = useRef(0);

  // Set active conversation and mark as read on mount
  useEffect(() => {
    setActiveConversation(conversationId);
    markConversationRead(conversationId);

    return () => {
      setActiveConversation(null);
    };
  }, [conversationId, setActiveConversation]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const isNewMessage = activeMessages.length > prevMessageCountRef.current;
    prevMessageCountRef.current = activeMessages.length;

    if (isNewMessage && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeMessages.length]);

  // Load older messages on scroll to top
  const handleScroll = useCallback(async () => {
    const container = messagesContainerRef.current;
    if (!container || loadingOlder || !hasMoreMessages) return;

    if (container.scrollTop < 100) {
      setLoadingOlder(true);
      const oldestMessage = activeMessages[0];
      if (oldestMessage) {
        try {
          const res = await fetch(
            `/messages/${conversationId}/older?cursor=${oldestMessage.created_at}`
          );
          if (res.ok) {
            const data = await res.json();
            loadOlderMessages(data.messages, data.hasMore);
          }
        } catch {
          // Silently fail — user can retry by scrolling up again
        }
      }
      setLoadingOlder(false);
    }
  }, [
    loadingOlder,
    hasMoreMessages,
    activeMessages,
    conversationId,
    loadOlderMessages,
  ]);

  const otherUser = conversation.other_participant;

  return (
    <div className="flex h-full flex-col">
      {/* Chat header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        {/* Back button (mobile) */}
        <Link
          href="/messages"
          className="flex-shrink-0 rounded-md p-1 hover:bg-muted md:hidden"
          aria-label="Back to conversations"
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
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
        </Link>

        {/* Other user info */}
        <Link
          href={`/profile/${otherUser.profile_id}`}
          className="flex items-center gap-3 hover:opacity-80"
        >
          {otherUser.photo_url ? (
            <img
              src={otherUser.photo_url}
              alt={otherUser.full_name}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
              {otherUser.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold">{otherUser.full_name}</p>
          </div>
        </Link>
      </div>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4"
        onScroll={handleScroll}
      >
        {loadingOlder && (
          <div className="mb-4 flex justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        )}

        {activeMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">
              Start the conversation with {otherUser.full_name}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {activeMessages.map((msg, index) => {
              const prevMsg = index > 0 ? activeMessages[index - 1] : null;
              const showAvatar =
                !prevMsg || prevMsg.sender_id !== msg.sender_id;
              const isNewSender =
                prevMsg && prevMsg.sender_id !== msg.sender_id;

              // Show group timestamp for the first message, or when >5 min
              // has passed since the previous message (like Messenger/Instagram)
              const showGroupTimestamp =
                !prevMsg ||
                new Date(msg.created_at).getTime() -
                  new Date(prevMsg.created_at).getTime() >=
                  FIVE_MINUTES_MS;

              return (
                <div
                  key={msg.id}
                  className={isNewSender ? "pt-3" : ""}
                >
                  <MessageBubble
                    message={msg}
                    isOwn={msg.sender_id === currentUserId}
                    showAvatar={showAvatar}
                    showGroupTimestamp={showGroupTimestamp}
                  />
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message input */}
      <MessageInput
        conversationId={conversationId}
        currentUserId={currentUserId}
      />
    </div>
  );
}

export function ChatViewSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex-1 space-y-4 px-4 py-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`flex gap-2 ${i % 2 === 0 ? "" : "flex-row-reverse"}`}
          >
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className={`h-10 rounded-2xl ${i % 2 === 0 ? "w-48" : "w-36"}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
