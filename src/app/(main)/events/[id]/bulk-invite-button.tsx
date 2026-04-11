"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { bulkInviteGroupMembers } from "./bulk-invite-action";

interface Props {
  eventId: string;
  groupName: string;
}

export function BulkInviteButton({ eventId, groupName }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleConfirm() {
    startTransition(async () => {
      const result = await bulkInviteGroupMembers(eventId);
      setOpen(false);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      const { invited, skipped } = result.data;
      if (invited === 0) {
        toast.info("All group members were already invited.");
      } else {
        toast.success(
          `Invited ${invited} member${invited !== 1 ? "s" : ""}.${skipped > 0 ? ` ${skipped} already invited or skipped.` : ""}`
        );
      }
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => setOpen(true)}
      >
        {pending ? "Inviting..." : "Invite all members"}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Invite all group members"
        description={`This will send an invitation to every member of "${groupName}" who hasn't already been invited. This can only be done once per 7 days.`}
        confirmLabel="Invite all"
        disabled={pending}
        onConfirm={handleConfirm}
      />
    </>
  );
}
