import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getNotificationPreferences } from "@/lib/queries/notification-preferences";
import type { NotificationType } from "@/lib/types";
import { NotificationPreferencesForm } from "./notification-preferences-form";

export const dynamic = "force-dynamic";

interface PreferenceConfig {
  type: NotificationType;
  label: string;
  description: string;
}

const NOTIFICATION_TYPES: PreferenceConfig[] = [
  {
    type: "connection_request",
    label: "Connection requests",
    description: "When someone sends you a connection request",
  },
  {
    type: "connection_accepted",
    label: "Connection accepted",
    description: "When someone accepts your connection request",
  },
  {
    type: "new_message",
    label: "New messages",
    description: "When you receive a new message",
  },
  {
    type: "verification_update",
    label: "Verification updates",
    description: "When your verification status changes",
  },
];

export default async function NotificationSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const preferences = await getNotificationPreferences(user.id);

  // Build a map of type -> email_enabled (default true if no row)
  const preferencesMap: Record<NotificationType, boolean> = {} as Record<
    NotificationType,
    boolean
  >;
  for (const config of NOTIFICATION_TYPES) {
    const pref = preferences.find((p) => p.notification_type === config.type);
    preferencesMap[config.type] = pref ? pref.email_enabled : true;
  }

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">Email Notifications</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Choose which notifications you&apos;d like to receive by email.
        In-app notifications are always enabled.
      </p>
      <NotificationPreferencesForm
        types={NOTIFICATION_TYPES}
        preferences={preferencesMap}
      />
    </div>
  );
}
