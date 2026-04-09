import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { EventRow } from "@/lib/types";
import { EventForm } from "../../event-form";

export const metadata = { title: "Edit event" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!event) notFound();

  // Host check (creator or cohost)
  const { data: isHost } = await supabase.rpc("is_event_host", {
    p_event_id: id,
    p_user_id: user.id,
  });
  if (!isHost) redirect(`/events/${id}`);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Edit event</h1>
      <EventForm mode="edit" initial={event as EventRow} />
    </div>
  );
}
