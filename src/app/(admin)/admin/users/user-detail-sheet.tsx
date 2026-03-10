"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminUserRow, AdminAuditLogEntry, AdminAction } from "@/lib/types";
import {
  banUser,
  unbanUser,
  suspendUser,
  unsuspendUser,
  promoteToModerator,
  demoteToUser,
  adminVerifyUser,
  adminDeleteUser,
  getUserAuditLog,
} from "./actions";
import { UserActionDialog } from "./user-action-dialog";

interface UserDetailSheetProps {
  user: AdminUserRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionComplete: () => void;
  currentAdminId: string;
}

const ACTION_LABELS: Record<AdminAction, string> = {
  verify: "Verified user",
  ban: "Banned user",
  unban: "Unbanned user",
  suspend: "Suspended user",
  unsuspend: "Unsuspended user",
  promote: "Promoted to moderator",
  demote: "Demoted to user",
  delete: "Deleted account",
};

export function UserDetailSheet({
  user,
  open,
  onOpenChange,
  onActionComplete,
  currentAdminId,
}: UserDetailSheetProps) {
  const [auditLog, setAuditLog] = useState<AdminAuditLogEntry[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Action dialog state
  const [dialogAction, setDialogAction] = useState<"ban" | "suspend" | "delete" | null>(null);

  useEffect(() => {
    if (!open || !user) {
      setAuditLog([]);
      return;
    }

    setIsLoadingAudit(true);
    getUserAuditLog(user.id).then((result) => {
      setIsLoadingAudit(false);
      if (result.success) {
        setAuditLog(result.data);
      }
    });
  }, [open, user]);

  if (!user) return null;

  const isSelf = user.id === currentAdminId;
  const isTargetAdmin = user.role === "admin";
  const isBanned = !user.is_active;
  const isSuspended =
    user.suspended_until !== null && new Date(user.suspended_until) > new Date();

  async function handleQuickAction(
    action: () => Promise<{ success: boolean; error?: string }>,
    successMessage: string
  ) {
    setIsProcessing(true);
    const result = await action();
    setIsProcessing(false);

    if (result.success) {
      toast.success(successMessage);
      onOpenChange(false);
      onActionComplete();
    } else {
      toast.error("error" in result ? result.error : "Action failed.");
    }
  }

  async function handleDialogConfirm(reason: string, days?: number) {
    if (!dialogAction || !user) return;

    setIsProcessing(true);
    let result: { success: boolean; error?: string };

    switch (dialogAction) {
      case "ban":
        result = await banUser(user.id, reason);
        break;
      case "suspend":
        result = await suspendUser(user.id, days ?? 7, reason);
        break;
      case "delete":
        result = await adminDeleteUser(user.id);
        break;
      default:
        result = { success: false, error: "Unknown action" };
    }

    setIsProcessing(false);
    setDialogAction(null);

    if (result.success) {
      const messages = {
        ban: `${user.full_name ?? "User"} has been banned.`,
        suspend: `${user.full_name ?? "User"} has been suspended for ${days} day${days !== 1 ? "s" : ""}.`,
        delete: `${user.full_name ?? "User"}'s account has been deleted.`,
      };
      toast.success(messages[dialogAction]);
      onOpenChange(false);
      onActionComplete();
    } else {
      toast.error("error" in result ? result.error : "Action failed.");
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>User Details</SheetTitle>
            <SheetDescription>
              Manage this user&apos;s role, status, and account.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4 px-4">
            {/* Profile summary */}
            <div className="flex items-center gap-3">
              {user.photo_url ? (
                <img
                  src={user.photo_url}
                  alt={user.full_name ?? ""}
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-lg font-medium">
                  {(user.full_name ?? user.email).charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-medium text-lg">
                  {user.full_name ?? "No profile"}
                </p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <Separator />

            {/* Status grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Role</p>
                <p className="mt-0.5 text-sm capitalize">{user.role}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Verification</p>
                <p className="mt-0.5 text-sm capitalize">{user.verification_status}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Account Status</p>
                <p className="mt-0.5 text-sm">
                  {isBanned
                    ? "Banned"
                    : isSuspended
                      ? `Suspended until ${new Date(user.suspended_until!).toLocaleDateString()}`
                      : "Active"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Joined</p>
                <p className="mt-0.5 text-sm">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
              {user.graduation_year && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Graduation Year</p>
                  <p className="mt-0.5 text-sm">{user.graduation_year}</p>
                </div>
              )}
              {user.primary_industry_name && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Industry</p>
                  <p className="mt-0.5 text-sm">{user.primary_industry_name}</p>
                </div>
              )}
              {user.ban_reason && (
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Ban Reason</p>
                  <p className="mt-0.5 text-sm">{user.ban_reason}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Actions */}
            {isSelf ? (
              <p className="text-sm text-muted-foreground italic">
                You cannot modify your own account.
              </p>
            ) : isTargetAdmin ? (
              <p className="text-sm text-muted-foreground italic">
                Cannot modify another admin&apos;s account.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium">Actions</p>
                <div className="flex flex-wrap gap-2">
                  {/* Verification */}
                  {user.verification_status !== "verified" && (
                    <Button
                      size="sm"
                      onClick={() =>
                        handleQuickAction(
                          () => adminVerifyUser(user.id),
                          `${user.full_name ?? "User"} has been verified.`
                        )
                      }
                      disabled={isProcessing}
                    >
                      Verify
                    </Button>
                  )}

                  {/* Role management */}
                  {user.role === "user" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleQuickAction(
                          () => promoteToModerator(user.id),
                          `${user.full_name ?? "User"} promoted to moderator.`
                        )
                      }
                      disabled={isProcessing}
                    >
                      Promote to Moderator
                    </Button>
                  )}
                  {user.role === "moderator" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleQuickAction(
                          () => demoteToUser(user.id),
                          `${user.full_name ?? "User"} demoted to user.`
                        )
                      }
                      disabled={isProcessing}
                    >
                      Demote to User
                    </Button>
                  )}

                  {/* Suspension */}
                  {isSuspended ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleQuickAction(
                          () => unsuspendUser(user.id),
                          `${user.full_name ?? "User"} has been unsuspended.`
                        )
                      }
                      disabled={isProcessing}
                    >
                      Unsuspend
                    </Button>
                  ) : (
                    !isBanned && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDialogAction("suspend")}
                        disabled={isProcessing}
                      >
                        Suspend
                      </Button>
                    )
                  )}

                  {/* Ban/Unban */}
                  {isBanned ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleQuickAction(
                          () => unbanUser(user.id),
                          `${user.full_name ?? "User"} has been unbanned.`
                        )
                      }
                      disabled={isProcessing}
                    >
                      Unban
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDialogAction("ban")}
                      disabled={isProcessing}
                    >
                      Ban
                    </Button>
                  )}

                  {/* Delete */}
                  {!isBanned && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDialogAction("delete")}
                      disabled={isProcessing}
                    >
                      Delete Account
                    </Button>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Audit log */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Action History</p>
              {isLoadingAudit ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : auditLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">No actions recorded.</p>
              ) : (
                <div className="space-y-2">
                  {auditLog.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p>
                          <span className="font-medium">
                            {entry.admin_name ?? "Admin"}
                          </span>{" "}
                          {ACTION_LABELS[entry.action] ?? entry.action}
                        </p>
                        {entry.details && Object.keys(entry.details).length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {entry.details.reason
                              ? `Reason: ${entry.details.reason}`
                              : entry.details.days
                                ? `Duration: ${entry.details.days} day(s)`
                                : null}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <UserActionDialog
        action={dialogAction}
        userName={user.full_name ?? user.email}
        userEmail={user.email}
        onConfirm={handleDialogConfirm}
        onCancel={() => setDialogAction(null)}
        isProcessing={isProcessing}
      />
    </>
  );
}
