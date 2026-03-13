import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { ReportsClient } from "./components/reports-client";

export default async function ModerationReportsPage() {
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

  if (!userData || !["moderator", "admin"].includes(userData.role)) {
    redirect("/dashboard");
  }

  const t = await getTranslations("moderation");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("description")}
        </p>
      </div>
      <ReportsClient role={userData.role as "moderator" | "admin"} />
    </div>
  );
}
