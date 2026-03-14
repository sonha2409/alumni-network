"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMessages } from "./messages-provider";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { MediaPanel } from "./media-panel";
import { markConversationRead } from "../actions";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user-avatar";
import type { ConversationWithDetails } from "@/lib/types";

const FIVE_MINUTES_MS = 5 * 60 * 1000;

interface ChatViewProps {
  conversationId: string;
  currentUserId: string;
  conversation: ConversationWithDetails;
  mutedUntil?: string | null;
  isOtherUserDeleted?: boolean;
}

export function ChatView({
  conversationId,
  currentUserId,
  conversation,
  mutedUntil,
  isOtherUserDeleted,
}: ChatViewProps) {
  const t = useTranslations("messages");
  const {
    activeMessages,
    setActiveConversation,
    hasMoreMessages,
    loadOlderMessages,
    isOtherUserTyping,
    otherUserLastReadAt,
    broadcastRead,
  } = useMessages();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const prevMessageCountRef = useRef(0);
  const [mediaPanelOpen, setMediaPanelOpen] = useState(false);

  // Set active conversation and mark as read on mount
  useEffect(() => {
    setActiveConversation(conversationId);
    markConversationRead(conversationId).then(() => {
      const now = new Date().toISOString();
      broadcastRead(now);
    });

    return () => {
      setActiveConversation(null);
    };
  }, [conversationId, setActiveConversation, broadcastRead]);

  // Auto-scroll to bottom on new messages + mark as read
  useEffect(() => {
    const isNewMessage = activeMessages.length > prevMessageCountRef.current;
    prevMessageCountRef.current = activeMessages.length;

    if (isNewMessage && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });

      // If the newest message is from the other user, mark as read
      const lastMsg = activeMessages[activeMessages.length - 1];
      if (lastMsg && lastMsg.sender_id !== currentUserId) {
        markConversationRead(conversationId).then(() => {
          broadcastRead(new Date().toISOString());
        });
      }
    }
  }, [activeMessages.length, conversationId, currentUserId, broadcastRead]);

  // Auto-scroll when typing indicator appears
  useEffect(() => {
    if (isOtherUserTyping && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOtherUserTyping]);

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
    <div className="flex h-full">
      {/* Chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Chat header */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          {/* Back button (mobile) */}
          <Link
            href="/messages"
            className="flex-shrink-0 rounded-md p-1 hover:bg-muted md:hidden"
            aria-label={t("backToConversations")}
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
          {isOtherUserDeleted ? (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                ?
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">
                  {t("deletedUser")}
                </p>
              </div>
            </div>
          ) : (
            <Link
              href={`/profile/${otherUser.profile_id}`}
              className="flex items-center gap-3 hover:opacity-80"
            >
              <UserAvatar
                photoUrl={otherUser.photo_url}
                fullName={otherUser.full_name}
                size="md"
              />
              <div>
                <p className="text-sm font-semibold">{otherUser.full_name}</p>
              </div>
            </Link>
          )}

          <div className="flex-1" />

          {/* Media panel toggle */}
          <button
            onClick={() => setMediaPanelOpen((prev) => !prev)}
            className={`rounded-md p-1.5 transition-colors ${
              mediaPanelOpen
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted text-muted-foreground"
            }`}
            aria-label={mediaPanelOpen ? t("closeMediaPanel") : t("openMediaPanel")}
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
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v13.5A1.5 1.5 0 0 0 3.75 21Z"
              />
            </svg>
          </button>
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
                {t("startConversation", { name: otherUser.full_name })}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {activeMessages.map((msg, index) => {
                const prevMsg = index > 0 ? activeMessages[index - 1] : null;
                const nextMsg = index < activeMessages.length - 1 ? activeMessages[index + 1] : null;
                const showAvatar =
                  !prevMsg || prevMsg.sender_id !== msg.sender_id;
                const isNewSender =
                  prevMsg && prevMsg.sender_id !== msg.sender_id;
                const isOwn = msg.sender_id === currentUserId;

                // Show group timestamp for the first message, or when >5 min
                // has passed since the previous message (like Messenger/Instagram)
                const showGroupTimestamp =
                  !prevMsg ||
                  new Date(msg.created_at).getTime() -
                    new Date(prevMsg.created_at).getTime() >=
                    FIVE_MINUTES_MS;

                // Read status: show only on the last own message before
                // the other user's next message, or the very last own message
                let readStatus: "delivered" | "read" | undefined;
                if (isOwn && !msg.id.startsWith("optimistic-")) {
                  const isLastOwnBeforeOther = !nextMsg || nextMsg.sender_id !== currentUserId;
                  if (isLastOwnBeforeOther) {
                    if (otherUserLastReadAt && new Date(msg.created_at) <= new Date(otherUserLastReadAt)) {
                      readStatus = "read";
                    } else {
                      readStatus = "delivered";
                    }
                  }
                }

                return (
                  <div
                    key={msg.id}
                    className={isNewSender ? "pt-3" : ""}
                  >
                    <MessageBubble
                      message={msg}
                      isOwn={isOwn}
                      showAvatar={showAvatar}
                      showGroupTimestamp={showGroupTimestamp}
                      readStatus={readStatus}
                    />
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isOtherUserTyping && (
                <div className="pt-3">
                  <div className="flex items-end gap-2">
                    <UserAvatar
                      photoUrl={otherUser.photo_url}
                      fullName={otherUser.full_name}
                      size="sm"
                      className="flex-shrink-0"
                    />
                    <div className="rounded-2xl bg-muted px-4 py-3">
                      <div className="flex items-center gap-1" aria-label={t("typing")}>
                        <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
                        <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
                        <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message input */}
        {isOtherUserDeleted ? (
          <div
            className="border-t bg-muted/50 px-4 py-3 text-center text-sm text-muted-foreground"
            role="status"
          >
            This person is no longer available. You can view the conversation
            history but cannot send new messages.
          </div>
        ) : mutedUntil ? (
          <div
            className="border-t bg-red-50 px-4 py-3 text-center text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400"
            role="alert"
          >
            Your messaging is temporarily restricted until{" "}
            {new Date(mutedUntil).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}.
          </div>
        ) : (
          <MessageInput
            conversationId={conversationId}
            currentUserId={currentUserId}
          />
        )}
      </div>

      {/* Media panel (desktop: side panel, mobile: full overlay) */}
      {mediaPanelOpen && (
        <>
          {/* Desktop side panel */}
          <div className="hidden md:block">
            <MediaPanel
              conversationId={conversationId}
              onClose={() => setMediaPanelOpen(false)}
            />
          </div>

          {/* Mobile full-screen overlay */}
          <div className="fixed inset-0 z-50 bg-background md:hidden">
            <MediaPanel
              conversationId={conversationId}
              onClose={() => setMediaPanelOpen(false)}
            />
          </div>
        </>
      )}
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
