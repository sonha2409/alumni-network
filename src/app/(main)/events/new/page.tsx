import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { EventForm } from "../event-form";

export const metadata = { title: "Create event" };

export default async function NewEventPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("users")
    .select("verification_status")
    .eq("id", user.id)
    .single();

  if (me?.verification_status !== "verified") {
    redirect("/events");
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create event</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Host a reunion, meetup, or virtual gathering for fellow alumni.
        </p>
      </div>
      <EventForm mode="create" />
    </div>
  );
}
