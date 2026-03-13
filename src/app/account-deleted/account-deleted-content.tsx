"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cancelAccountDeletion } from "@/app/(main)/settings/account/actions";

interface AccountDeletedContentProps {
  daysRemaining: number;
  isExpired: boolean;
  deletedAt: string;
}

export function AccountDeletedContent({
  daysRemaining,
  isExpired,
  deletedAt,
}: AccountDeletedContentProps) {
  const t = useTranslations("accountDeleted");
  const tc = useTranslations("common");
  const [isReactivating, setIsReactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReactivate() {
    setIsReactivating(true);
    setError(null);

    try {
      const result = await cancelAccountDeletion();

      if (!result.success) {
        setError(result.error);
        return;
      }

      // Redirect to dashboard on success
      window.location.href = "/dashboard";
    } finally {
      setIsReactivating(false);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const deletedDate = new Date(deletedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-xl">
            {isExpired
              ? t("titleExpired")
              : t("titleScheduled")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isExpired ? (
            <>
              <p className="text-muted-foreground">
                {t("expiredMessage", { date: deletedDate })}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("canRejoin")}
              </p>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">
                {t("scheduledMessage", { date: deletedDate })}
              </p>
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {t("daysRemaining", { days: daysRemaining })}
                </p>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                onClick={handleReactivate}
                disabled={isReactivating}
                className="w-full"
              >
                {isReactivating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("reactivating")}
                  </>
                ) : (
                  t("reactivate")
                )}
              </Button>

              <p className="text-xs text-muted-foreground">
                {t("reactivateNote")}
              </p>
            </>
          )}

          <Button variant="outline" onClick={handleLogout} className="w-full">
            {tc("logOut")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
