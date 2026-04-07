import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { PrivacyToggle } from "./privacy-toggle";

export const dynamic = "force-dynamic";

export default async function PrivacySettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("show_last_active")
    .eq("user_id", user.id)
    .single();

  // Default to true if the column is somehow null or the row doesn't exist yet.
  const showLastActive = profile?.show_last_active ?? true;

  const t = await getTranslations("settings");

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">{t("privacyTitle")}</h2>
      <p className="mb-6 text-sm text-muted-foreground">{t("privacyDesc")}</p>
      <PrivacyToggle initialShowLastActive={showLastActive} />
    </div>
  );
}
