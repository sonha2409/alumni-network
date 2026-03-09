"use client";

import { useState, useTransition } from "react";
import {
  UserPlus,
  Clock,
  UserCheck,
  UserX,
  Ban,
  MoreHorizontal,
  Loader2,
  Check,
  X,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RelationshipInfo } from "@/lib/types";
import {
  sendConnectionRequest,
  acceptConnectionRequest,
  rejectConnectionRequest,
  disconnectUser,
  blockUser,
  unblockUser,
} from "@/app/(main)/connections/actions";

interface ConnectionActionsProps {
  targetUserId: string;
  relationship: RelationshipInfo;
  isVerified: boolean;
}

export function ConnectionActions({
  targetUserId,
  relationship,
  isVerified,
}: ConnectionActionsProps) {
  const [status, setStatus] = useState(relationship.status);
  const [connId, setConnId] = useState(relationship.connectionId);
  const [blkId, setBlkId] = useState(relationship.blockId);
  const [isPending, startTransition] = useTransition();
  const [showMessageInput, setShowMessageInput] = useState(false);
  const [message, setMessage] = useState("");

  if (!isVerified) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="cursor-not-allowed opacity-60"
      >
        <UserPlus className="mr-1.5 h-4 w-4" />
        Verify to Connect
      </Button>
    );
  }

  function handleConnect() {
    if (showMessageInput) {
      // Submit the request
      startTransition(async () => {
        const result = await sendConnectionRequest(
          targetUserId,
          message || undefined
        );
        if (result.success) {
          setStatus("pending_sent");
          setShowMessageInput(false);
          setMessage("");
          toast.success("Connection request sent!");
        } else {
          toast.error(result.error);
        }
      });
    } else {
      setShowMessageInput(true);
    }
  }

  function handleQuickConnect() {
    startTransition(async () => {
      const result = await sendConnectionRequest(targetUserId);
      if (result.success) {
        setStatus("pending_sent");
        toast.success("Connection request sent!");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleAccept() {
    if (!connId) return;
    startTransition(async () => {
      const result = await acceptConnectionRequest(connId);
      if (result.success) {
        setStatus("connected");
        toast.success("Connection accepted!");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleReject() {
    if (!connId) return;
    startTransition(async () => {
      const result = await rejectConnectionRequest(connId);
      if (result.success) {
        setStatus("none");
        setConnId(null);
        toast.success("Request rejected.");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDisconnect() {
    if (!connId) return;
    startTransition(async () => {
      const result = await disconnectUser(connId);
      if (result.success) {
        setStatus("none");
        setConnId(null);
        toast.success("Disconnected.");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleCancelRequest() {
    if (!connId) return;
    startTransition(async () => {
      const result = await disconnectUser(connId);
      if (result.success) {
        setStatus("none");
        setConnId(null);
        toast.success("Request cancelled.");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleBlock() {
    startTransition(async () => {
      const result = await blockUser(targetUserId);
      if (result.success) {
        setStatus("blocked_by_me");
        setConnId(null);
        setBlkId(result.data as unknown as string);
        toast.success("User blocked.");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleUnblock() {
    if (!blkId) return;
    startTransition(async () => {
      const result = await unblockUser(blkId);
      if (result.success) {
        setStatus("none");
        setBlkId(null);
        toast.success("User unblocked.");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {/* Main action button based on status */}
        {status === "none" && (
          <>
            {showMessageInput ? (
              <Button
                onClick={handleConnect}
                disabled={isPending}
                size="sm"
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25"
              >
                {isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-1.5 h-4 w-4" />
                )}
                Send Request
              </Button>
            ) : (
              <Button
                onClick={handleQuickConnect}
                disabled={isPending}
                size="sm"
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25"
              >
                {isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-1.5 h-4 w-4" />
                )}
                Connect
              </Button>
            )}
            {!showMessageInput && (
              <Button
                onClick={() => setShowMessageInput(true)}
                variant="outline"
                size="sm"
                className="transition-colors duration-200"
                title="Add a message"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            )}
          </>
        )}

        {status === "pending_sent" && (
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={handleCancelRequest}
            className="border-amber-500/30 bg-amber-500/10 text-amber-600 transition-all duration-300 hover:bg-amber-500/20 dark:text-amber-400"
          >
            {isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <>
                <Clock className="mr-1.5 h-4 w-4" />
                <span className="relative flex h-2 w-2 mr-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
              </>
            )}
            Request Sent
          </Button>
        )}

        {status === "pending_received" && (
          <>
            <Button
              onClick={handleAccept}
              disabled={isPending}
              size="sm"
              className="bg-emerald-500 text-white transition-all duration-200 hover:scale-105 hover:bg-emerald-600"
            >
              {isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-4 w-4" />
              )}
              Accept
            </Button>
            <Button
              onClick={handleReject}
              disabled={isPending}
              variant="outline"
              size="sm"
              className="border-red-500/30 bg-red-500/10 text-red-600 transition-colors duration-200 hover:bg-red-500/20 dark:text-red-400"
            >
              <X className="mr-1.5 h-4 w-4" />
              Reject
            </Button>
          </>
        )}

        {status === "connected" && (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-600 transition-all duration-300 dark:text-emerald-400">
            <UserCheck className="h-4 w-4" />
            Connected
          </div>
        )}

        {status === "blocked_by_me" && (
          <Button
            onClick={handleUnblock}
            disabled={isPending}
            variant="outline"
            size="sm"
            className="text-muted-foreground opacity-60 transition-opacity duration-200 hover:opacity-100"
          >
            {isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Ban className="mr-1.5 h-4 w-4" />
            )}
            Unblock
          </Button>
        )}

        {/* Overflow menu — always visible unless blocked */}
        {status !== "blocked_by_me" && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {status === "connected" && (
                <>
                  <DropdownMenuItem
                    onClick={handleDisconnect}
                    className="text-red-600 focus:text-red-600 dark:text-red-400"
                  >
                    <UserX className="mr-2 h-4 w-4" />
                    Disconnect
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={handleBlock}
                className="text-red-600 focus:text-red-600 dark:text-red-400"
              >
                <Ban className="mr-2 h-4 w-4" />
                Block user
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Message input for connect */}
      {showMessageInput && status === "none" && (
        <div className="flex items-center gap-2 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a note (optional)..."
            maxLength={500}
            className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowMessageInput(false);
              setMessage("");
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
