import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

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
  const [pendingResult, totalUsersResult, inviteCountResult, activeAnnouncementsResult] = await Promise.all([
    supabase
      .from("verification_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("bulk_invites")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("announcements")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  const pendingCount = pendingResult.count ?? 0;
  const totalUsers = totalUsersResult.count ?? 0;
  const inviteCount = inviteCountResult.count ?? 0;
  const activeAnnouncements = activeAnnouncementsResult.count ?? 0;

  const t = await getTranslations("admin.dashboard");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/verification">
          <Card className="transition-colors hover:border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {t("verificationQueue")}
                {pendingCount > 0 && (
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-xs font-medium text-primary-foreground">
                    {pendingCount}
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                {t("verificationDesc")}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/users">
          <Card className="transition-colors hover:border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {t("userManagement")}
                <span className="text-sm font-normal text-muted-foreground">
                  {t("usersCount", { count: totalUsers })}
                </span>
              </CardTitle>
              <CardDescription>
                {t("userManagementDesc")}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/analytics">
          <Card className="transition-colors hover:border-primary/50">
            <CardHeader>
              <CardTitle>{t("analytics")}</CardTitle>
              <CardDescription>
                {t("analyticsDesc")}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/bulk-invite">
          <Card className="transition-colors hover:border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {t("bulkInvite")}
                {inviteCount > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {t("sent", { count: inviteCount })}
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                {t("bulkInviteDesc")}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/announcements">
          <Card className="transition-colors hover:border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {t("announcements")}
                {activeAnnouncements > 0 && (
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-orange-500 px-2 text-xs font-medium text-white">
                    {activeAnnouncements}
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                {t("announcementsDesc")}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/settings">
          <Card className="transition-colors hover:border-primary/50">
            <CardHeader>
              <CardTitle>{t("settingsCard")}</CardTitle>
              <CardDescription>
                {t("settingsDesc")}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
