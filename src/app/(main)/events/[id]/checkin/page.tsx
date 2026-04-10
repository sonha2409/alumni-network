import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { processCheckin } from "./actions";
import { CheckinResult } from "./checkin-result";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function CheckinPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { token } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch event title for display
  const { data: event } = await supabase
    .from("events")
    .select("title")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!token) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-12 text-center">
        <h1 className="text-xl font-bold">Check-in</h1>
        <p className="text-sm text-muted-foreground">
          No check-in token provided. Please scan the QR code shown by the event
          host.
        </p>
        <Link
          href={`/events/${id}`}
          className="text-sm text-primary underline underline-offset-4"
        >
          Go to event
        </Link>
      </div>
    );
  }

  const result = await processCheckin(id, token);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-12 text-center">
      <CheckinResult
        success={result.success}
        error={!result.success ? result.error : undefined}
        alreadyCheckedIn={result.success ? result.data.alreadyCheckedIn : false}
        eventTitle={event?.title ?? "Event"}
        eventId={id}
      />
    </div>
  );
}

export const dynamic = "force-dynamic";
