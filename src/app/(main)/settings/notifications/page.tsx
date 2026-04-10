import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
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

import { NearbyEventsRadiusForm } from "./nearby-events-radius-form";

const NOTIFICATION_TYPE_KEYS: { type: NotificationType; labelKey: string; descKey: string }[] = [
  { type: "connection_request", labelKey: "notifConnectionRequest", descKey: "notifConnectionRequestDesc" },
  { type: "connection_accepted", labelKey: "notifConnectionAccepted", descKey: "notifConnectionAcceptedDesc" },
  { type: "new_message", labelKey: "notifNewMessage", descKey: "notifNewMessageDesc" },
  { type: "verification_update", labelKey: "notifVerification", descKey: "notifVerificationDesc" },
  { type: "profile_staleness", labelKey: "notifStaleness", descKey: "notifStalenessDesc" },
  { type: "event_nearby", labelKey: "notifEventNearby", descKey: "notifEventNearbyDesc" },
  { type: "event_comment", labelKey: "notifEventComment", descKey: "notifEventCommentDesc" },
];

export default async function NotificationSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const t = await getTranslations("settings");
  const [preferences, profileRes] = await Promise.all([
    getNotificationPreferences(user.id),
    supabase
      .from("profiles")
      .select("notify_events_within_km")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const currentRadius: number | null =
    profileRes.data?.notify_events_within_km ?? null;

  const NOTIFICATION_TYPES: PreferenceConfig[] = NOTIFICATION_TYPE_KEYS.map((k) => ({
    type: k.type,
    label: t(k.labelKey),
    description: t(k.descKey),
  }));

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
      <h2 className="mb-1 text-lg font-semibold">{t("emailNotifications")}</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        {t("emailNotificationsDesc")}
      </p>
      <NotificationPreferencesForm
        types={NOTIFICATION_TYPES}
        preferences={preferencesMap}
      />

      <div className="mt-8 border-t pt-6">
        <h2 className="mb-1 text-lg font-semibold">{t("nearbyEventsTitle")}</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          {t("nearbyEventsDesc")}
        </p>
        <NearbyEventsRadiusForm currentRadius={currentRadius} />
      </div>
    </div>
  );
}
