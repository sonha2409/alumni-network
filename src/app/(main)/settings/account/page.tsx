import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ExportDataSection } from "./export-data-section";
import { DeleteAccountSection } from "./delete-account-section";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-1 text-lg font-semibold">Data Export</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Download a copy of your data including your profile, career history,
          education, connections, messages, and group memberships.
        </p>
        <ExportDataSection />
      </div>

      <hr className="border-border" />

      <div>
        <h2 className="mb-1 text-lg font-semibold text-destructive">
          Danger Zone
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Permanently delete your account and all associated data. This action
          has a 30-day grace period during which you can reactivate your account.
        </p>
        <DeleteAccountSection userEmail={user.email!} />
      </div>
    </div>
  );
}
