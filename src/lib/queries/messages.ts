import { createClient } from "@/lib/supabase/server";
import type { ConversationWithDetails, MessageWithSender } from "@/lib/types";

/**
 * Get all conversations for a user, with the other participant's profile and unread count.
 * Uses a single RPC that returns everything in one query (P10).
 * Sorted by most recent message first.
 */
export async function getConversations(
  userId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ conversations: ConversationWithDetails[]; totalCount: number }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_user_conversations", {
    p_user_id: userId,
    p_page: page,
    p_page_size: pageSize,
  });

  if (error) {
    console.error("[Query:getConversations]", {
      userId,
      error: error.message,
    });
    return { conversations: [], totalCount: 0 };
  }

  if (!data || data.length === 0) {
    return { conversations: [], totalCount: 0 };
  }

  const conversations: ConversationWithDetails[] = data.map(
    (row: Record<string, unknown>) => ({
      id: row.conversation_id as string,
      last_message_at: row.last_message_at as string,
      last_message_preview: row.last_message_preview as string | null,
      is_active: row.is_active as boolean,
      created_at: row.created_at as string,
      other_participant: {
        user_id: row.other_user_id as string,
        full_name: (row.other_full_name as string) ?? "Deleted User",
        photo_url: row.other_photo_url as string | null,
        profile_id: (row.other_profile_id as string) ?? "",
      },
      unread_count: Number(row.unread_count) || 0,
      is_muted: (row.is_muted as boolean) ?? false,
    })
  );

  const totalCount = Number((data[0] as Record<string, unknown>)?.total_count) || 0;

  return { conversations, totalCount };
}

/**
 * Get messages in a conversation with cursor-based pagination.
 * Returns messages in reverse chronological order (newest first).
 */
export async function getMessages(
  userId: string,
  conversationId: string,
  cursor?: string,
  limit: number = 50
): Promise<{ messages: MessageWithSender[]; hasMore: boolean }> {
  const supabase = await createClient();

  let query = supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit + 1); // Fetch one extra to check if there are more

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: messages, error } = await query;

  if (error || !messages) {
    if (error) {
      console.error("[Query:getMessages]", {
        userId,
        conversationId,
        error: error.message,
      });
    }
    return { messages: [], hasMore: false };
  }

  const hasMore = messages.length > limit;
  const sliced = hasMore ? messages.slice(0, limit) : messages;

  // Fetch sender profiles
  const senderIds = [...new Set(sliced.map((m) => m.sender_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, photo_url")
    .in("user_id", senderIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.user_id, p])
  );

  // Batch-fetch attachments for these messages
  const messageIds = sliced.map((m) => m.id);
  const { data: attachments } = await supabase
    .from("message_attachments")
    .select("*")
    .in("message_id", messageIds)
    .eq("is_deleted", false);

  const attachmentsByMessageId = new Map<string, typeof attachments>();
  for (const att of attachments ?? []) {
    const existing = attachmentsByMessageId.get(att.message_id) ?? [];
    existing.push(att);
    attachmentsByMessageId.set(att.message_id, existing);
  }

  const messagesWithSender: MessageWithSender[] = sliced.map((msg) => {
    const profile = profileMap.get(msg.sender_id);
    return {
      ...msg,
      sender: {
        user_id: msg.sender_id,
        full_name: profile?.full_name ?? "Deleted User",
        photo_url: profile?.photo_url ?? null,
      },
      attachments: attachmentsByMessageId.get(msg.id) ?? [],
    };
  });

  return { messages: messagesWithSender, hasMore };
}

/**
 * Get total unread message count across all conversations for a user.
 * Uses a single RPC query instead of N+1 per-conversation counts (P0).
 * Used for the navbar badge.
 */
export async function getTotalUnreadCount(userId: string): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_unread_counts", {
    p_user_id: userId,
  });

  if (error) {
    console.error("[Query:getTotalUnreadCount]", {
      userId,
      error: error.message,
    });
    return 0;
  }

  return (data ?? []).reduce(
    (sum: number, row: Record<string, unknown>) => sum + (Number(row.unread_count) || 0),
    0
  );
}

/**
 * Find an existing 1-on-1 conversation between two users.
 */
export async function findExistingConversation(
  userId: string,
  otherUserId: string
): Promise<string | null> {
  const supabase = await createClient();

  // Get conversation IDs where both users are participants
  const { data: myConvs } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId);

  if (!myConvs || myConvs.length === 0) return null;

  const myConvIds = myConvs.map((c) => c.conversation_id);

  const { data: sharedConv } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", otherUserId)
    .in("conversation_id", myConvIds)
    .limit(1)
    .maybeSingle();

  return sharedConv?.conversation_id ?? null;
}

