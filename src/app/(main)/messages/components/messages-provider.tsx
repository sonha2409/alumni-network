"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { ConversationWithDetails, MessageWithSender } from "@/lib/types";

interface MessagesContextValue {
  conversations: ConversationWithDetails[];
  activeMessages: MessageWithSender[];
  activeConversationId: string | null;
  totalUnreadCount: number;
  setActiveConversation: (id: string | null) => void;
  addOptimisticMessage: (message: MessageWithSender) => void;
  updateConversation: (conv: Partial<ConversationWithDetails> & { id: string }) => void;
  updateMessage: (messageId: string, updates: Partial<MessageWithSender>) => void;
  loadOlderMessages: (messages: MessageWithSender[], hasMore: boolean) => void;
  hasMoreMessages: boolean;
  setMessages: (messages: MessageWithSender[], hasMore: boolean) => void;
}

const MessagesContext = createContext<MessagesContextValue | null>(null);

export function useMessages() {
  const ctx = useContext(MessagesContext);
  if (!ctx) {
    throw new Error("useMessages must be used within MessagesProvider");
  }
  return ctx;
}

interface MessagesProviderProps {
  children: React.ReactNode;
  initialConversations: ConversationWithDetails[];
  initialUnreadCount: number;
  currentUserId: string;
}

export function MessagesProvider({
  children,
  initialConversations,
  initialUnreadCount,
  currentUserId,
}: MessagesProviderProps) {
  const [conversations, setConversations] =
    useState<ConversationWithDetails[]>(initialConversations);
  const [activeMessages, setActiveMessages] = useState<MessageWithSender[]>([]);
  const [activeConversationId, setActiveConversationIdState] = useState<
    string | null
  >(null);
  const [totalUnreadCount, setTotalUnreadCount] = useState(initialUnreadCount);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);

  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);
  const supabaseRef = useRef(createClient());

  // Subscribe to real-time message updates for the active conversation
  useEffect(() => {
    if (!activeConversationId) {
      if (channelRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    // Clean up previous channel
    if (channelRef.current) {
      supabaseRef.current.removeChannel(channelRef.current);
    }

    const channel = supabaseRef.current
      .channel(`conversation:${activeConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new as MessageWithSender;

          // For own messages: the optimistic message is already in state
          // with an `optimistic-*` id. Replace it with the real one.
          if (newMsg.sender_id === currentUserId) {
            setActiveMessages((prev) => {
              // Check if the real message already exists (by real id)
              if (prev.some((m) => m.id === newMsg.id)) return prev;

              // Find and replace the oldest optimistic message from this sender
              const optimisticIndex = prev.findIndex(
                (m) => m.id.startsWith("optimistic-") && m.sender_id === currentUserId
              );

              if (optimisticIndex !== -1) {
                // Replace optimistic with real message, preserving sender info
                const updated = [...prev];
                updated[optimisticIndex] = {
                  ...newMsg,
                  sender: prev[optimisticIndex].sender,
                };
                return updated;
              }

              // No optimistic message found — just add it
              return prev;
            });
            return;
          }

          // For other user's messages: add with sender info
          setActiveMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;

            const conv = conversations.find(
              (c) => c.id === activeConversationId
            );
            if (conv) {
              newMsg.sender = {
                user_id: conv.other_participant.user_id,
                full_name: conv.other_participant.full_name,
                photo_url: conv.other_participant.photo_url,
              };
            } else {
              newMsg.sender = {
                user_id: newMsg.sender_id,
                full_name: "Unknown",
                photo_url: null,
              };
            }

            return [...prev, newMsg];
          });

          // Update conversation preview
          updateConversationInList(activeConversationId, {
            last_message_at: newMsg.created_at,
            last_message_preview:
              newMsg.content.length > 100
                ? newMsg.content.slice(0, 100) + "..."
                : newMsg.content,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        (payload) => {
          const updated = payload.new as MessageWithSender;
          setActiveMessages((prev) =>
            prev.map((m) =>
              m.id === updated.id ? { ...m, ...updated } : m
            )
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabaseRef.current.removeChannel(channel);
      channelRef.current = null;
    };
  }, [activeConversationId, currentUserId, conversations]);

  // Subscribe to new messages across all conversations (for unread badge updates)
  useEffect(() => {
    const convIds = conversations.map((c) => c.id);
    if (convIds.length === 0) return;

    const userChannel = supabaseRef.current
      .channel(`user-messages:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMsg = payload.new as { id: string; conversation_id: string; sender_id: string; content: string; created_at: string };

          // Only process messages in our conversations, not from us
          if (
            !convIds.includes(newMsg.conversation_id) ||
            newMsg.sender_id === currentUserId
          ) {
            return;
          }

          // If not viewing this conversation, increment unread
          if (newMsg.conversation_id !== activeConversationId) {
            setTotalUnreadCount((prev) => prev + 1);
            setConversations((prev) =>
              prev.map((c) =>
                c.id === newMsg.conversation_id
                  ? {
                      ...c,
                      unread_count: c.unread_count + 1,
                      last_message_at: newMsg.created_at,
                      last_message_preview:
                        newMsg.content.length > 100
                          ? newMsg.content.slice(0, 100) + "..."
                          : newMsg.content,
                    }
                  : c
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabaseRef.current.removeChannel(userChannel);
    };
  }, [conversations, currentUserId, activeConversationId]);

  const setActiveConversation = useCallback(
    (id: string | null) => {
      setActiveConversationIdState(id);
      if (id) {
        const conv = conversations.find((c) => c.id === id);
        if (conv && conv.unread_count > 0) {
          setTotalUnreadCount((prev) =>
            Math.max(0, prev - conv.unread_count)
          );
          setConversations((prev) =>
            prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c))
          );
        }
      }
    },
    [conversations]
  );

  const addOptimisticMessage = useCallback((message: MessageWithSender) => {
    setActiveMessages((prev) => [...prev, message]);
  }, []);

  const updateConversation = useCallback(
    (conv: Partial<ConversationWithDetails> & { id: string }) => {
      updateConversationInList(conv.id, conv);
    },
    []
  );

  function updateConversationInList(
    convId: string,
    updates: Partial<ConversationWithDetails>
  ) {
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === convId ? { ...c, ...updates } : c
      );
      return updated.sort((a, b) => {
        const aTime = a.last_message_at
          ? new Date(a.last_message_at).getTime()
          : 0;
        const bTime = b.last_message_at
          ? new Date(b.last_message_at).getTime()
          : 0;
        return bTime - aTime;
      });
    });
  }

  const updateMessage = useCallback(
    (messageId: string, updates: Partial<MessageWithSender>) => {
      setActiveMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, ...updates } : m))
      );
    },
    []
  );

  const loadOlderMessages = useCallback(
    (messages: MessageWithSender[], hasMore: boolean) => {
      setActiveMessages((prev) => [...messages, ...prev]);
      setHasMoreMessages(hasMore);
    },
    []
  );

  const setMessages = useCallback(
    (messages: MessageWithSender[], hasMore: boolean) => {
      setActiveMessages([...messages].reverse());
      setHasMoreMessages(hasMore);
    },
    []
  );

  return (
    <MessagesContext.Provider
      value={{
        conversations,
        activeMessages,
        activeConversationId,
        totalUnreadCount,
        setActiveConversation,
        addOptimisticMessage,
        updateConversation,
        updateMessage,
        loadOlderMessages,
        hasMoreMessages,
        setMessages,
      }}
    >
      {children}
    </MessagesContext.Provider>
  );
}
