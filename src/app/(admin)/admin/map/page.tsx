import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import {
  getMapCountryDataAdmin,
  getMapTrendData,
} from "@/lib/queries/map";
import { getIndustriesWithSpecializations } from "@/lib/queries/taxonomy";
import { AdminMapClient } from "./admin-map-client";

export default async function AdminMapPage() {
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

  const [countryData, trendData, industries] = await Promise.all([
    getMapCountryDataAdmin(false, {}),
    getMapTrendData(undefined, 6),
    getIndustriesWithSpecializations(),
  ]);

  const t = await getTranslations("map");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("adminTitle")}</h1>
        <p className="text-muted-foreground">
          {t("adminDesc")}
        </p>
      </div>

      <AdminMapClient
        initialCountryData={countryData}
        initialTrendData={trendData}
        industries={industries}
      />
    </div>
  );
}
