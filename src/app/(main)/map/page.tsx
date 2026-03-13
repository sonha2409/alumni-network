import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { getMapCountryData } from "@/lib/queries/map";
import { getIndustriesWithSpecializations } from "@/lib/queries/taxonomy";
import { MapClient } from "./map-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("map");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function MapPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Only verified users can access the map
  const { data: currentUser } = await supabase
    .from("users")
    .select("verification_status")
    .eq("id", user.id)
    .single();

  if (currentUser?.verification_status !== "verified") {
    redirect("/directory");
  }

  const [countryData, industries] = await Promise.all([
    getMapCountryData({}),
    getIndustriesWithSpecializations(),
  ]);

  return <MapClient initialCountryData={countryData} industries={industries} />;
}
