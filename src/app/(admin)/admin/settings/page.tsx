import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { getAppSetting } from "@/lib/queries/app-settings";
import { StalenessSettingsForm } from "./staleness-settings-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || userData.role !== "admin") {
    redirect("/dashboard");
  }

  const stalenessMonths = await getAppSetting<number>(
    "profile_staleness_months",
    6
  );

  const t = await getTranslations("admin.settings");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <div className="max-w-xl">
        <StalenessSettingsForm currentMonths={stalenessMonths} />
      </div>
    </div>
  );
}
