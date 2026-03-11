import { createClient } from "@/lib/supabase/server";
import type { ConversationWithDetails, MessageWithSender } from "@/lib/types";

/**
 * Get all conversations for a user, with the other participant's profile and unread count.
 * Sorted by most recent message first.
 */
export async function getConversations(
  userId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ conversations: ConversationWithDetails[]; totalCount: number }> {
  const supabase = await createClient();

  // Get conversation IDs for this user
  const { data: myParticipations, error: partError } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at, is_muted")
    .eq("user_id", userId);

  if (partError || !myParticipations || myParticipations.length === 0) {
    if (partError) {
      console.error("[Query:getConversations]", {
        userId,
        error: partError.message,
      });
    }
    return { conversations: [], totalCount: 0 };
  }

  const conversationIds = myParticipations.map((p) => p.conversation_id);
  const participationMap = new Map(
    myParticipations.map((p) => [
      p.conversation_id,
      { lastReadAt: p.last_read_at, isMuted: p.is_muted },
    ])
  );

  // Fetch conversations with pagination
  const { data: conversations, error: convError, count } = await supabase
    .from("conversations")
    .select("*", { count: "exact" })
    .in("id", conversationIds)
    .eq("is_active", true)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (convError || !conversations) {
    if (convError) {
      console.error("[Query:getConversations]", {
        userId,
        error: convError.message,
      });
    }
    return { conversations: [], totalCount: 0 };
  }

  // Get the other participants for these conversations
  const activeConvIds = conversations.map((c) => c.id);
  const { data: otherParticipants } = await supabase
    .from("conversation_participants")
    .select("conversation_id, user_id")
    .in("conversation_id", activeConvIds)
    .neq("user_id", userId);

  if (!otherParticipants || otherParticipants.length === 0) {
    return { conversations: [], totalCount: 0 };
  }

  // Fetch profiles for the other participants
  const otherUserIds = [...new Set(otherParticipants.map((p) => p.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, user_id, full_name, photo_url")
    .in("user_id", otherUserIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.user_id, p])
  );

  const otherParticipantMap = new Map(
    otherParticipants.map((p) => [p.conversation_id, p.user_id])
  );

  // Calculate unread counts per conversation
  const unreadCounts = await getUnreadCountsForConversations(
    userId,
    activeConvIds,
    participationMap
  );

  const result: ConversationWithDetails[] = conversations
    .map((conv) => {
      const otherUserId = otherParticipantMap.get(conv.id);
      if (!otherUserId) return null;

      const profile = profileMap.get(otherUserId);
      const participation = participationMap.get(conv.id);

      return {
        id: conv.id,
        last_message_at: conv.last_message_at,
        last_message_preview: conv.last_message_preview,
        is_active: conv.is_active,
        created_at: conv.created_at,
        other_participant: {
          user_id: otherUserId,
          full_name: profile?.full_name ?? "Deleted User",
          photo_url: profile?.photo_url ?? null,
          profile_id: profile?.id ?? "",
        },
        unread_count: unreadCounts.get(conv.id) ?? 0,
        is_muted: participation?.isMuted ?? false,
      };
    })
    .filter(Boolean) as ConversationWithDetails[];

  return { conversations: result, totalCount: count ?? 0 };
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
 * Used for the navbar badge.
 */
export async function getTotalUnreadCount(userId: string): Promise<number> {
  const supabase = await createClient();

  // Get all participations
  const { data: participations, error } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", userId);

  if (error || !participations || participations.length === 0) {
    return 0;
  }

  let totalUnread = 0;

  // Count unread messages across all conversations
  for (const p of participations) {
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", p.conversation_id)
      .gt("created_at", p.last_read_at)
      .neq("sender_id", userId);

    totalUnread += count ?? 0;
  }

  return totalUnread;
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

// =============================================================================
// Internal helpers
// =============================================================================

async function getUnreadCountsForConversations(
  userId: string,
  conversationIds: string[],
  participationMap: Map<string, { lastReadAt: string; isMuted: boolean }>
): Promise<Map<string, number>> {
  const supabase = await createClient();
  const unreadMap = new Map<string, number>();

  // Batch: count unread for each conversation
  for (const convId of conversationIds) {
    const participation = participationMap.get(convId);
    if (!participation) continue;

    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", convId)
      .gt("created_at", participation.lastReadAt)
      .neq("sender_id", userId);

    unreadMap.set(convId, count ?? 0);
  }

  return unreadMap;
}
