import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { sendEmail } from "@/lib/email";
import { profileStalenessEmail } from "@/lib/email-templates";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const cronSecret = process.env.CRON_SECRET;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * POST /api/cron/staleness-emails
 * Called by pg_cron (or manually) to send profile staleness email nudges.
 * Protected by x-cron-secret header.
 */
export async function POST(request: NextRequest) {
  // Verify cron secret
  const secret = request.headers.get("x-cron-secret");
  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service role client to bypass RLS
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get stale profiles using the database function
    const { data: staleProfiles, error } = await supabase.rpc(
      "get_stale_profiles_for_email",
      { p_batch_size: 50 }
    );

    if (error) {
      console.error("[Cron:stalenessEmails]", { error: error.message });
      return NextResponse.json(
        { error: "Failed to query stale profiles" },
        { status: 500 }
      );
    }

    if (!staleProfiles || staleProfiles.length === 0) {
      return NextResponse.json({ sent: 0, message: "No stale profiles found" });
    }

    let sent = 0;
    const quickUpdateUrl = `${siteUrl}/settings/quick-update`;

    for (const profile of staleProfiles) {
      const updatedAt = new Date(profile.profile_updated_at);
      const monthsAgo = Math.floor(
        (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );

      const { subject, html } = profileStalenessEmail(
        profile.full_name,
        monthsAgo,
        quickUpdateUrl,
        profile.user_id
      );

      await sendEmail(profile.email, subject, html);

      // Mark that we sent the email (update profiles via service role)
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ last_staleness_email_at: new Date().toISOString() })
        .eq("user_id", profile.user_id);

      if (updateError) {
        console.error("[Cron:stalenessEmails:update]", {
          userId: profile.user_id,
          error: updateError.message,
        });
        // Continue with next profile
      } else {
        sent++;
      }
    }

    console.log("[Cron:stalenessEmails]", {
      queried: staleProfiles.length,
      sent,
    });

    return NextResponse.json({ sent, total: staleProfiles.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Cron:stalenessEmails]", { error: message });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
