"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Users,
  Inbox,
  Send,
  Ban,
  Check,
  X,
  UserX,
  Loader2,
  Clock,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import type { ConnectionWithProfile, Block } from "@/lib/types";
import {
  acceptConnectionRequest,
  rejectConnectionRequest,
  disconnectUser,
  unblockUser,
} from "./actions";

interface ConnectionsTabsProps {
  connected: ConnectionWithProfile[];
  pendingReceived: ConnectionWithProfile[];
  pendingSent: ConnectionWithProfile[];
  blocked: (Block & {
    profile: {
      id: string;
      full_name: string;
      photo_url: string | null;
    } | null;
  })[];
}

type TabKey = "connected" | "received" | "sent" | "blocked";

export function ConnectionsTabs({
  connected,
  pendingReceived,
  pendingSent,
  blocked,
}: ConnectionsTabsProps) {
  const t = useTranslations("connections");
  const tc = useTranslations("common");
  const [activeTab, setActiveTab] = useState<TabKey>("connected");

  const tabs: { key: TabKey; label: string; icon: typeof Users }[] = [
    { key: "connected", label: t("tabConnected"), icon: Users },
    { key: "received", label: t("tabReceived"), icon: Inbox },
    { key: "sent", label: t("tabSent"), icon: Send },
    { key: "blocked", label: t("tabBlocked"), icon: Ban },
  ];

  const counts: Record<TabKey, number> = {
    connected: connected.length,
    received: pendingReceived.length,
    sent: pendingSent.length,
    blocked: blocked.length,
  };

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl bg-muted/70 p-1" role="tablist">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-background text-primary shadow-sm ring-1 ring-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 hidden sm:block ${isActive ? "text-primary" : ""}`} />
              <span>{tab.label}</span>
              {counts[tab.key] > 0 && (
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold transition-colors duration-200 ${
                    tab.key === "received" && counts.received > 0
                      ? "bg-red-500 text-white animate-in zoom-in-50 duration-300"
                      : isActive
                        ? "bg-primary/10 text-primary"
                        : "bg-muted-foreground/20 text-muted-foreground"
                  }`}
                >
                  {counts[tab.key]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="mt-6 animate-in fade-in-0 duration-200">
        {activeTab === "connected" && (
          <ConnectedList connections={connected} />
        )}
        {activeTab === "received" && (
          <ReceivedList connections={pendingReceived} />
        )}
        {activeTab === "sent" && <SentList connections={pendingSent} />}
        {activeTab === "blocked" && <BlockedList blocks={blocked} />}
      </div>
    </div>
  );
}

// =============================================================================
// Connected Tab
// =============================================================================

function ConnectedList({
  connections,
}: {
  connections: ConnectionWithProfile[];
}) {
  const t = useTranslations("connections");

  if (connections.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={t("noConnections")}
        description={t("noConnectionsDesc")}
        actionLabel={t("browseDirectory")}
        actionHref="/directory"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {connections.map((conn, index) => (
        <ConnectionCard
          key={conn.id}
          connection={conn}
          index={index}
          actions={<DisconnectButton connectionId={conn.id} />}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Received Tab
// =============================================================================

function ReceivedList({
  connections,
}: {
  connections: ConnectionWithProfile[];
}) {
  const t = useTranslations("connections");

  if (connections.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title={t("noPending")}
        description={t("noPendingDesc")}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {connections.map((conn, index) => (
        <ConnectionCard
          key={conn.id}
          connection={conn}
          index={index}
          showMessage
          actions={<AcceptRejectButtons connectionId={conn.id} />}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Sent Tab
// =============================================================================

function SentList({ connections }: { connections: ConnectionWithProfile[] }) {
  const t = useTranslations("connections");
  const tc = useTranslations("common");

  if (connections.length === 0) {
    return (
      <EmptyState
        icon={Send}
        title={t("noSent")}
        description={t("noSentDesc")}
        actionLabel={t("browseDirectory")}
        actionHref="/directory"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {connections.map((conn, index) => (
        <ConnectionCard
          key={conn.id}
          connection={conn}
          index={index}
          actions={<CancelButton connectionId={conn.id} />}
          statusBadge={
            <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
              </span>
              {tc("pending")}
            </span>
          }
        />
      ))}
    </div>
  );
}

// =============================================================================
// Blocked Tab
// =============================================================================

function BlockedList({
  blocks,
}: {
  blocks: (Block & {
    profile: {
      id: string;
      full_name: string;
      photo_url: string | null;
    } | null;
  })[];
}) {
  const t = useTranslations("connections");

  if (blocks.length === 0) {
    return (
      <EmptyState
        icon={Ban}
        title={t("noBlocked")}
        description={t("noBlockedDesc")}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {blocks.map((block, index) => (
        <div
          key={block.id}
          className="flex items-center justify-between rounded-xl border border-border bg-card p-4 opacity-60 transition-opacity hover:opacity-100"
          style={{
            animationDelay: `${index * 75}ms`,
            animationFillMode: "backwards",
          }}
        >
          <div className="flex items-center gap-3">
            {block.profile?.photo_url ? (
              <Image
                src={block.profile.photo_url}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover ring-1 ring-border"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground ring-1 ring-border">
                {block.profile?.full_name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() ?? "?"}
              </div>
            )}
            <span className="text-sm font-medium">
              {block.profile?.full_name ?? "Unknown user"}
            </span>
          </div>
          <UnblockButton blockId={block.id} />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Shared Components
// =============================================================================

function ConnectionCard({
  connection,
  index,
  actions,
  showMessage,
  statusBadge,
}: {
  connection: ConnectionWithProfile;
  index: number;
  actions: React.ReactNode;
  showMessage?: boolean;
  statusBadge?: React.ReactNode;
}) {
  const tc = useTranslations("common");
  const { profile } = connection;
  const location = [profile.city, profile.state_province, profile.country]
    .filter(Boolean)
    .join(", ");

  const initials = profile.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 animate-in fade-in-0 slide-in-from-bottom-2 dark:hover:shadow-primary/5"
      style={{
        animationDelay: `${index * 75}ms`,
        animationDuration: "300ms",
        animationFillMode: "backwards",
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3.5">
        <Link href={`/profile/${profile.id}`}>
          {profile.photo_url ? (
            <Image
              src={profile.photo_url}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-border transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground ring-1 ring-border">
              {initials}
            </div>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={`/profile/${profile.id}`}
            className="truncate text-sm font-semibold leading-tight text-foreground transition-colors hover:text-primary"
          >
            {profile.full_name}
          </Link>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {tc("classOf", { year: profile.graduation_year })}
          </p>
          {statusBadge && <div className="mt-1">{statusBadge}</div>}
        </div>
      </div>

      {/* Industry/career */}
      {(profile.current_job_title || profile.primary_industry) && (
        <div className="mt-3 text-xs text-muted-foreground">
          {profile.current_job_title && profile.current_company && (
            <p className="line-clamp-1">
              {profile.current_job_title} at {profile.current_company}
            </p>
          )}
          {profile.primary_industry && (
            <span className="mt-1 inline-block rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
              {profile.primary_industry.name}
            </span>
          )}
        </div>
      )}

      {/* Location */}
      {location && (
        <p className="mt-2 truncate text-xs text-muted-foreground">{location}</p>
      )}

      {/* Intro message (received tab) */}
      {showMessage && connection.message && (
        <div className="mt-3 rounded-lg bg-muted/50 p-3">
          <p className="text-xs italic text-muted-foreground">
            &ldquo;{connection.message}&rdquo;
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">{actions}</div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: typeof Users;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-primary/15 bg-gradient-to-b from-primary/[0.02] to-transparent py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
        <Icon className="h-6 w-6 text-primary/60" />
      </div>
      <h3 className="text-base font-medium">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link href={actionHref}>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 transition-all duration-200 hover:scale-105"
          >
            <Search className="mr-1.5 h-4 w-4" />
            {actionLabel}
          </Button>
        </Link>
      )}
    </div>
  );
}

// =============================================================================
// Action Buttons
// =============================================================================

function AcceptRejectButtons({ connectionId }: { connectionId: string }) {
  const t = useTranslations("connections");
  const [isPending, startTransition] = useTransition();
  const [handled, setHandled] = useState(false);

  if (handled) return null;

  return (
    <>
      <Button
        onClick={() => {
          startTransition(async () => {
            const result = await acceptConnectionRequest(connectionId);
            if (result.success) {
              setHandled(true);
              toast.success(t("accepted"));
            } else {
              toast.error(result.error);
            }
          });
        }}
        disabled={isPending}
        size="sm"
        className="bg-emerald-500 text-white transition-all duration-200 hover:scale-105 hover:bg-emerald-600"
      >
        {isPending ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <Check className="mr-1.5 h-4 w-4" />
        )}
        {t("accept")}
      </Button>
      <Button
        onClick={() => {
          startTransition(async () => {
            const result = await rejectConnectionRequest(connectionId);
            if (result.success) {
              setHandled(true);
              toast.success(t("rejectedToast"));
            } else {
              toast.error(result.error);
            }
          });
        }}
        disabled={isPending}
        variant="outline"
        size="sm"
        className="border-red-500/30 bg-red-500/10 text-red-600 transition-colors duration-200 hover:bg-red-500/20 dark:text-red-400"
      >
        <X className="mr-1.5 h-4 w-4" />
        {t("reject")}
      </Button>
    </>
  );
}

function DisconnectButton({ connectionId }: { connectionId: string }) {
  const t = useTranslations("connections");
  const [isPending, startTransition] = useTransition();
  const [disconnected, setDisconnected] = useState(false);

  if (disconnected) {
    return (
      <span className="text-xs text-muted-foreground animate-in fade-in-0 duration-200">
        {t("disconnectedToast")}
      </span>
    );
  }

  return (
    <Button
      onClick={() => {
        startTransition(async () => {
          const result = await disconnectUser(connectionId);
          if (result.success) {
            setDisconnected(true);
            toast.success(t("disconnectedToast"));
          } else {
            toast.error(result.error);
          }
        });
      }}
      disabled={isPending}
      variant="ghost"
      size="sm"
      className="text-muted-foreground transition-colors duration-200 hover:text-red-600 dark:hover:text-red-400"
    >
      {isPending ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
      ) : (
        <UserX className="mr-1.5 h-4 w-4" />
      )}
      {t("disconnect")}
    </Button>
  );
}

function CancelButton({ connectionId }: { connectionId: string }) {
  const t = useTranslations("connections");
  const tc = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [cancelled, setCancelled] = useState(false);

  if (cancelled) {
    return (
      <span className="text-xs text-muted-foreground animate-in fade-in-0 duration-200">
        {t("cancelledToast")}
      </span>
    );
  }

  return (
    <Button
      onClick={() => {
        startTransition(async () => {
          const result = await disconnectUser(connectionId);
          if (result.success) {
            setCancelled(true);
            toast.success(t("cancelledToast"));
          } else {
            toast.error(result.error);
          }
        });
      }}
      disabled={isPending}
      variant="ghost"
      size="sm"
      className="text-muted-foreground transition-colors duration-200 hover:text-red-600 dark:hover:text-red-400"
    >
      {isPending ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
      ) : (
        <X className="mr-1.5 h-4 w-4" />
      )}
      {tc("cancel")}
    </Button>
  );
}

function UnblockButton({ blockId }: { blockId: string }) {
  const t = useTranslations("connections");
  const [isPending, startTransition] = useTransition();
  const [unblocked, setUnblocked] = useState(false);

  if (unblocked) {
    return (
      <span className="text-xs text-muted-foreground animate-in fade-in-0 duration-200">
        {t("unblockedToast")}
      </span>
    );
  }

  return (
    <Button
      onClick={() => {
        startTransition(async () => {
          const result = await unblockUser(blockId);
          if (result.success) {
            setUnblocked(true);
            toast.success(t("unblockedToast"));
          } else {
            toast.error(result.error);
          }
        });
      }}
      disabled={isPending}
      variant="outline"
      size="sm"
      className="text-muted-foreground transition-colors duration-200"
    >
      {isPending ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
      ) : (
        <Ban className="mr-1.5 h-4 w-4" />
      )}
      {t("unblock")}
    </Button>
  );
}
