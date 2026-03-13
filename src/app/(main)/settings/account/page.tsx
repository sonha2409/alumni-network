import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { ExportDataSection } from "./export-data-section";
import { DeleteAccountSection } from "./delete-account-section";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const t = await getTranslations("settings");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-1 text-lg font-semibold">{t("dataExport")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {t("dataExportDesc")}
        </p>
        <ExportDataSection />
      </div>

      <hr className="border-border" />

      <div>
        <h2 className="mb-1 text-lg font-semibold text-destructive">
          {t("dangerZone")}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {t("dangerZoneDesc")}
        </p>
        <DeleteAccountSection userEmail={user.email!} />
      </div>
    </div>
  );
}
