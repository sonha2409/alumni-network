"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { rsvp, cancelRsvp } from "../rsvp-actions";
import type { EventRsvpStatus } from "@/lib/types";

interface Props {
  eventId: string;
  currentStatus: EventRsvpStatus | null;
  isWaitlisted: boolean;
  needsReconfirm: boolean;
  disabled?: boolean;
}

/**
 * Three RSVP buttons (Going / Maybe / Can't go) + cancel.
 * "Going" may return `waitlisted` from the server if capacity is full.
 */
export function RsvpControls({
  eventId,
  currentStatus,
  isWaitlisted,
  needsReconfirm,
  disabled,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handle(status: EventRsvpStatus) {
    startTransition(async () => {
      const result = await rsvp({ eventId, status });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (result.data.status === "waitlisted") {
        toast.info("Event is full — you've been added to the waitlist.");
      } else {
        toast.success(`RSVP updated: ${result.data.status}`);
      }
      router.refresh();
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelRsvp(eventId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("RSVP cancelled");
      router.refresh();
    });
  }

  const anySet = currentStatus !== null || isWaitlisted;

  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <h2 className="text-sm font-semibold uppercase text-muted-foreground">
        Your RSVP
      </h2>

      {needsReconfirm && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          This event was updated. Please re-confirm your RSVP.
        </p>
      )}

      {isWaitlisted && (
        <p className="text-xs text-muted-foreground">
          You&apos;re on the waitlist — you&apos;ll be notified if a spot opens.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={currentStatus === "going" ? "default" : "outline"}
          disabled={disabled || pending}
          onClick={() => handle("going")}
        >
          Going
        </Button>
        <Button
          size="sm"
          variant={currentStatus === "maybe" ? "default" : "outline"}
          disabled={disabled || pending}
          onClick={() => handle("maybe")}
        >
          Maybe
        </Button>
        <Button
          size="sm"
          variant={currentStatus === "cant_go" ? "default" : "outline"}
          disabled={disabled || pending}
          onClick={() => handle("cant_go")}
        >
          Can&apos;t go
        </Button>
        {anySet && (
          <Button
            size="sm"
            variant="ghost"
            disabled={disabled || pending}
            onClick={handleCancel}
          >
            Clear
          </Button>
        )}
      </div>
    </section>
  );
}
