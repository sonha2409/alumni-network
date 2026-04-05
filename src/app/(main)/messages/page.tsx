import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getConversations, getTotalUnreadCount } from "@/lib/queries/messages";
import { MessagesProvider } from "./components/messages-provider";
import { ConversationList } from "./components/conversation-list";
import { NewMessageButton } from "./components/new-message-button";

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

  const t = await getTranslations("messages");

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
          <p className="font-medium">{t("restrictedTitle")}</p>
          <p className="mt-1 text-red-700 dark:text-red-400">
            {publicUser.muted_reason ? t("restrictedReason", { reason: publicUser.muted_reason }) : ""}
            {t("restrictedEnds", { date: new Date(publicUser.muted_until!).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) })}
            {" "}{t("restrictedNote")}
          </p>
        </div>
      )}
      <div className="flex h-[calc(100vh-8rem)] flex-col rounded-xl border border-border/60 bg-background shadow-sm md:flex-row">
        {/* Conversation list — full width on mobile, sidebar on desktop */}
        <div className="flex w-full flex-col border-r border-border/60 md:w-80 lg:w-96">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <h1 className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">{t("title")}</h1>
            <NewMessageButton />
          </div>
          <ConversationList />
        </div>

        {/* Empty state on desktop when no conversation is selected */}
        <div className="hidden flex-1 items-center justify-center bg-gradient-to-br from-primary/[0.02] to-transparent md:flex">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5">
              <svg
                className="h-7 w-7 text-primary/40"
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
            </div>
            <p className="text-sm text-muted-foreground">
              {t("selectConversation")}
            </p>
          </div>
        </div>
      </div>
    </MessagesProvider>
  );
}
