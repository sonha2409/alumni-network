import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getConversations, getTotalUnreadCount } from "@/lib/queries/messages";
import { MessagesProvider } from "./components/messages-provider";
import { ConversationList } from "./components/conversation-list";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check if verified + mute status
  const { data: publicUser } = await supabase
    .from("users")
    .select("verification_status, muted_until, muted_reason")
    .eq("id", user.id)
    .single();

  if (!publicUser || publicUser.verification_status !== "verified") {
    redirect("/verification");
  }

  const isMuted =
    publicUser.muted_until !== null &&
    new Date(publicUser.muted_until) > new Date();

  const [{ conversations }, unreadCount] = await Promise.all([
    getConversations(user.id),
    getTotalUnreadCount(user.id),
  ]);

  return (
    <MessagesProvider
      initialConversations={conversations}
      initialUnreadCount={unreadCount}
      currentUserId={user.id}
    >
      {isMuted && (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
          role="alert"
        >
          <p className="font-medium">Your messaging is temporarily restricted</p>
          <p className="mt-1 text-red-700 dark:text-red-400">
            {publicUser.muted_reason ? `Reason: ${publicUser.muted_reason}. ` : ""}
            Restriction ends on{" "}
            {new Date(publicUser.muted_until!).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}.
            You can still browse conversations but cannot send new messages.
          </p>
        </div>
      )}
      <div className="flex h-[calc(100vh-8rem)] flex-col rounded-lg border bg-background shadow-sm md:flex-row">
        {/* Conversation list — full width on mobile, sidebar on desktop */}
        <div className="flex w-full flex-col border-r md:w-80 lg:w-96">
          <div className="border-b px-4 py-3">
            <h1 className="text-lg font-semibold">Messages</h1>
          </div>
          <ConversationList />
        </div>

        {/* Empty state on desktop when no conversation is selected */}
        <div className="hidden flex-1 items-center justify-center md:flex">
          <div className="text-center">
            <svg
              className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
              />
            </svg>
            <p className="text-sm text-muted-foreground">
              Select a conversation to start chatting
            </p>
          </div>
        </div>
      </div>
    </MessagesProvider>
  );
}
