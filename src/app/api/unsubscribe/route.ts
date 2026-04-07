import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { NotificationType } from "@/lib/types";

const VALID_TYPES: NotificationType[] = [
  "connection_request",
  "connection_accepted",
  "new_message",
  "verification_update",
  "announcement",
];

/**
 * GET /api/unsubscribe?token=<base64url>
 *
 * One-click email unsubscribe. Token is a base64url-encoded "userId:notificationType".
 * Uses SECURITY DEFINER function so no auth session is required.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return htmlResponse(
      "Invalid Link",
      "This unsubscribe link is invalid or expired.",
      400
    );
  }

  // Decode token
  let userId: string;
  let notificationType: NotificationType;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 2) throw new Error("Invalid token format");

    userId = parts[0];
    notificationType = parts[1] as NotificationType;

    // Validate UUID format
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        userId
      )
    ) {
      throw new Error("Invalid user ID");
    }

    // Validate notification type
    if (!VALID_TYPES.includes(notificationType)) {
      throw new Error("Invalid notification type");
    }
  } catch {
    return htmlResponse(
      "Invalid Link",
      "This unsubscribe link is invalid or expired.",
      400
    );
  }

  // Use service client (SECURITY DEFINER function, no auth context needed)
  try {
    const supabase = createServiceClient();

    const { error } = await supabase.rpc("unsubscribe_email_notification", {
      p_user_id: userId,
      p_type: notificationType,
    });

    if (error) {
      console.error("[API:unsubscribe]", {
        userId,
        notificationType,
        error: error.message,
      });
      return htmlResponse(
        "Something went wrong",
        "We couldn't process your request. Please try again or manage your preferences in the app.",
        500
      );
    }

    const typeLabel = notificationType.replace(/_/g, " ");
    return htmlResponse(
      "Unsubscribed",
      `You've been unsubscribed from <strong>${typeLabel}</strong> emails. You can re-enable them anytime in your <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/settings/notifications" style="color:#2563eb;text-decoration:underline;">notification settings</a>.`,
      200
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API:unsubscribe]", { userId, error: message });
    return htmlResponse(
      "Something went wrong",
      "We couldn't process your request. Please try again later.",
      500
    );
  }
}

/**
 * Return a simple HTML page response (no React rendering needed).
 */
function htmlResponse(
  title: string,
  message: string,
  status: number
): NextResponse {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — PTNKAlum</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;">
  <div style="max-width:480px;background:#ffffff;border-radius:8px;padding:32px;text-align:center;margin:16px;">
    <h1 style="font-size:20px;color:#18181b;margin:0 0 12px;">${title}</h1>
    <p style="font-size:15px;color:#52525b;line-height:1.6;margin:0;">${message}</p>
  </div>
</body>
</html>`.trim();

  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
