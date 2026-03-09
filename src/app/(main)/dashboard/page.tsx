import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome{user?.email ? `, ${user.email}` : ""}! Your dashboard will
            be built out in future features.
          </p>
        </div>
        <LogoutButton />
      </div>
    </main>
  );
}
