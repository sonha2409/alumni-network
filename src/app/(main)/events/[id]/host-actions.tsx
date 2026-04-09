"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cancelEvent } from "../actions";

interface Props {
  eventId: string;
}

export function HostActions({ eventId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleCancel() {
    if (!confirm("Cancel this event? Attendees will be notified.")) return;
    startTransition(async () => {
      const result = await cancelEvent(eventId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Event cancelled");
      router.push("/events");
    });
  }

  return (
    <section className="flex flex-wrap gap-2 rounded-xl border bg-card p-4">
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
        onClick={handleCancel}
      >
        Cancel event
      </Button>
    </section>
  );
}
