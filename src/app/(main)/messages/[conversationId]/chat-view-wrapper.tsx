"use client";

import { useEffect } from "react";
import { ChatView } from "../components/chat-view";
import { useMessages } from "../components/messages-provider";
import type { ConversationWithDetails, MessageWithSender } from "@/lib/types";

interface ChatViewWrapperProps {
  conversationId: string;
  currentUserId: string;
  conversation: ConversationWithDetails;
  initialMessages: MessageWithSender[];
  initialHasMore: boolean;
  mutedUntil: string | null;
}

/**
 * Wrapper that initializes the messages provider with server-loaded data
 * then renders the interactive ChatView.
 */
export function ChatViewWrapper({
  conversationId,
  currentUserId,
  conversation,
  initialMessages,
  initialHasMore,
  mutedUntil,
}: ChatViewWrapperProps) {
  const { setMessages } = useMessages();

  // Load initial messages into the provider
  useEffect(() => {
    setMessages(initialMessages, initialHasMore);
  }, [conversationId, initialMessages, initialHasMore, setMessages]);

  return (
    <ChatView
      conversationId={conversationId}
      currentUserId={currentUserId}
      conversation={conversation}
      mutedUntil={mutedUntil}
    />
  );
}
