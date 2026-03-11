import { redirect } from "next/navigation";

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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Alumni Map</h1>
        <p className="text-muted-foreground">
          Geographic distribution of alumni across the platform.
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
