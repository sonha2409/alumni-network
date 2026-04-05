import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getConversations,
  getMessages,
  getTotalUnreadCount,
} from "@/lib/queries/messages";
import { MessagesProvider } from "../components/messages-provider";
import { ConversationList } from "../components/conversation-list";
import { ChatViewWrapper } from "./chat-view-wrapper";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ conversationId: string }>;
}

export default async function ConversationPage({ params }: Props) {
  const { conversationId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check if verified + mute status
  const { data: publicUser } = await supabase
    .from("users")
    .select("verification_status, muted_until")
    .eq("id", user.id)
    .single();

  if (!publicUser || publicUser.verification_status !== "verified") {
    redirect("/verification");
  }

  const mutedUntil =
    publicUser.muted_until && new Date(publicUser.muted_until) > new Date()
      ? publicUser.muted_until
      : null;

  // Verify user is a participant in this conversation
  const { data: participation } = await supabase
    .from("conversation_participants")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!participation) {
    notFound();
  }

  const [{ conversations }, unreadCount, { messages, hasMore }] =
    await Promise.all([
      getConversations(user.id),
      getTotalUnreadCount(user.id),
      getMessages(user.id, conversationId),
    ]);

  // Find the current conversation in the list
  const currentConversation = conversations.find(
    (c) => c.id === conversationId
  );

  if (!currentConversation) {
    notFound();
  }

  // Check if the other participant's account is deleted
  // Query is_active directly — admins can read all users via RLS,
  // so we can't rely on null to detect deleted users.
  const otherUserId = currentConversation.other_participant.user_id;
  const { data: otherUserRow } = await supabase
    .from("users")
    .select("is_active, deleted_at")
    .eq("id", otherUserId)
    .maybeSingle();

  const isOtherUserDeleted = !otherUserRow || !otherUserRow.is_active;

  return (
    <MessagesProvider
      initialConversations={conversations}
      initialUnreadCount={unreadCount}
      currentUserId={user.id}
    >
      <div className="flex h-[calc(100vh-8rem)] flex-col rounded-xl border border-border/60 bg-background shadow-sm md:flex-row">
        {/* Conversation list — hidden on mobile when viewing a chat */}
        <div className="hidden w-80 flex-col border-r border-border/60 md:flex lg:w-96">
          <div className="border-b border-border/60 px-4 py-3">
            <h1 className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Messages</h1>
          </div>
          <ConversationList />
        </div>

        {/* Chat view */}
        <div className="flex flex-1 flex-col">
          <ChatViewWrapper
            conversationId={conversationId}
            currentUserId={user.id}
            conversation={currentConversation}
            initialMessages={messages}
            initialHasMore={hasMore}
            mutedUntil={mutedUntil}
            isOtherUserDeleted={isOtherUserDeleted}
          />
        </div>
      </div>
    </MessagesProvider>
  );
}
