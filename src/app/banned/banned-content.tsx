"use client";

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
            {isBanned ? "Account Suspended" : "Account Temporarily Suspended"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isBanned ? (
            <p className="text-muted-foreground">
              Your account has been permanently suspended.
              {banReason && (
                <>
                  <br />
                  <span className="mt-2 block text-sm">
                    Reason: {banReason}
                  </span>
                </>
              )}
            </p>
          ) : (
            <p className="text-muted-foreground">
              Your account has been temporarily suspended
              {suspendedUntil && (
                <>
                  {" "}
                  until{" "}
                  <span className="font-medium text-foreground">
                    {new Date(suspendedUntil).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </>
              )}
              .
            </p>
          )}

          <p className="text-sm text-muted-foreground">
            If you believe this is an error, please contact support.
          </p>

          <Button variant="outline" onClick={handleLogout} className="w-full">
            Log Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
