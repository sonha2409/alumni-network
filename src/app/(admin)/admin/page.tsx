import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function AdminDashboardPage() {
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

  // Fetch quick stats
  const [pendingResult, totalUsersResult] = await Promise.all([
    supabase
      .from("verification_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true }),
  ]);

  const pendingCount = pendingResult.count ?? 0;
  const totalUsers = totalUsersResult.count ?? 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of platform administration.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/verification">
          <Card className="transition-colors hover:border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Verification Queue
                {pendingCount > 0 && (
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-xs font-medium text-primary-foreground">
                    {pendingCount}
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Review and approve alumni verification requests.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/users">
          <Card className="transition-colors hover:border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                User Management
                <span className="text-sm font-normal text-muted-foreground">
                  {totalUsers} users
                </span>
              </CardTitle>
              <CardDescription>
                Search, filter, and manage platform users.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
