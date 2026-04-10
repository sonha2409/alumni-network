"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cancelEvent } from "../actions";

interface Props {
  eventId: string;
  showCheckin: boolean;
}

export function HostActions({ eventId, showCheckin }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelEvent(eventId);
      if (!result.success) {
        toast.error(result.error);
        setCancelOpen(false);
        return;
      }
      toast.success("Event cancelled");
      router.push("/events");
    });
  }

  return (
    <section className="flex flex-wrap gap-2 rounded-xl border bg-card p-4">
      {showCheckin && (
        <Link
          href={`/events/${eventId}/host`}
          className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Check-in
        </Link>
      )}
      <Link
        href={`/events/${eventId}/edit`}
        className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent"
      >
        Edit
      </Link>
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() => setCancelOpen(true)}
      >
        Cancel event
      </Button>
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel event"
        description="Are you sure you want to cancel this event? All attendees will be notified."
        confirmLabel="Cancel event"
        variant="destructive"
        disabled={pending}
        onConfirm={handleCancel}
      />
    </section>
  );
}
