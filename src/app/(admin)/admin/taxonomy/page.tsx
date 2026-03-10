import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { TaxonomyClient } from "./taxonomy-client";

export default async function AdminTaxonomyPage() {
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Admin — Taxonomy</h1>
        <p className="text-muted-foreground">
          Manage industry categories and specializations.
        </p>
      </div>
      <TaxonomyClient />
    </div>
  );
}
