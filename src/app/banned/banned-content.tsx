"use client";

import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BannedContentProps {
  isBanned: boolean;
  suspendedUntil: string | null;
  banReason: string | null;
}

export function BannedContent({
  isBanned,
  suspendedUntil,
  banReason,
}: BannedContentProps) {
  const t = useTranslations("banned");
  const tc = useTranslations("common");

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-xl">
            {isBanned ? t("titleBanned") : t("titleSuspended")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isBanned ? (
            <p className="text-muted-foreground">
              {t("permanentMessage")}
              {banReason && (
                <>
                  <br />
                  <span className="mt-2 block text-sm">
                    {t("reason", { reason: banReason })}
                  </span>
                </>
              )}
            </p>
          ) : (
            <p className="text-muted-foreground">
              {suspendedUntil
                ? t("suspendedUntil", {
                    date: new Date(suspendedUntil).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }),
                  })
                : t("suspendedGeneric")}
            </p>
          )}

          <p className="text-sm text-muted-foreground">
            {t("contactSupport")}
          </p>

          <Button variant="outline" onClick={handleLogout} className="w-full">
            {tc("logOut")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
