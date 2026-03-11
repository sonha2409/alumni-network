import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AdminNavbar } from "@/components/navbar/admin-navbar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  if (!userData || !["admin", "moderator"].includes(userData.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen">
      <AdminNavbar role={userData.role as "admin" | "moderator"} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
