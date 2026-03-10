"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMessages } from "./messages-provider";
import { formatRelativeTime } from "@/lib/utils";

export function ConversationList() {
  const { conversations, activeConversationId } = useMessages();
  const pathname = usePathname();

  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
        <svg
          className="mb-4 h-12 w-12 text-muted-foreground/50"
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
        <p className="text-sm font-medium text-muted-foreground">
          No conversations yet
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Start a conversation from a connection&apos;s profile
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conv) => {
        const isActive = conv.id === activeConversationId;
        const hasUnread = conv.unread_count > 0;

        return (
          <Link
            key={conv.id}
            href={`/messages/${conv.id}`}
            className={`flex items-center gap-3 border-b px-4 py-3 transition-colors hover:bg-muted/50 ${
              isActive ? "bg-muted" : ""
            }`}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {conv.other_participant.photo_url ? (
                <img
                  src={conv.other_participant.photo_url}
                  alt={conv.other_participant.full_name}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                  {conv.other_participant.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              )}
              {/* Unread dot */}
              {hasUnread && (
                <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-blue-500 ring-2 ring-background" />
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`truncate text-sm ${
                    hasUnread ? "font-semibold" : "font-medium"
                  }`}
                >
                  {conv.other_participant.full_name}
                </p>
                {conv.last_message_at && (
                  <span className="flex-shrink-0 text-[11px] text-muted-foreground">
                    {formatRelativeTime(conv.last_message_at)}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`truncate text-xs ${
                    hasUnread
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {conv.last_message_preview ?? "No messages yet"}
                </p>
                {hasUnread && (
                  <span className="flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 px-1.5 text-[10px] font-bold text-white">
                    {conv.unread_count > 99 ? "99+" : conv.unread_count}
                  </span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
