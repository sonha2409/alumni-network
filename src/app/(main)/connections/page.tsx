import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import {
  getConnections,
  getPendingReceived,
  getPendingSent,
  getBlockedUsers,
} from "@/lib/queries/connections";
import { ConnectionsTabs } from "./connections-tabs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("connections");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ConnectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const t = await getTranslations("connections");

  const [connected, pendingReceived, pendingSent, blocked] = await Promise.all([
    getConnections(user.id),
    getPendingReceived(user.id),
    getPendingSent(user.id),
    getBlockedUsers(user.id),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <ConnectionsTabs
        connected={connected}
        pendingReceived={pendingReceived}
        pendingSent={pendingSent}
        blocked={blocked}
      />
    </div>
  );
}
