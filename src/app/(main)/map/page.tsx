import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getMapCountryData } from "@/lib/queries/map";
import { getIndustriesWithSpecializations } from "@/lib/queries/taxonomy";
import { MapClient } from "./map-client";

export const metadata: Metadata = {
  title: "Alumni Map — AlumNet",
  description: "Explore where fellow alumni are located around the world.",
};

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
