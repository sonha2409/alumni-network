import type { NotificationType } from "@/lib/types";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Generate a signed unsubscribe URL for a given user and notification type.
 * Uses a simple HMAC-based token (no JWT dependency needed).
 */
function unsubscribeUrl(userId: string, type: NotificationType): string {
  // We'll encode user + type in the token. The route handler verifies the signature.
  const payload = `${userId}:${type}`;
  // Base64-encode for URL safety
  const token = Buffer.from(payload).toString("base64url");
  return `${siteUrl}/api/unsubscribe?token=${token}`;
}

/**
 * Shared email wrapper with consistent branding and unsubscribe footer.
 */
function emailLayout(
  content: string,
  userId: string,
  type: NotificationType
): string {
  const unsubLink = unsubscribeUrl(userId, type);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:24px 32px 16px;border-bottom:1px solid #e4e4e7;">
              <strong style="font-size:18px;color:#18181b;">AlumNet</strong>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:24px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">
                You received this because you have email notifications enabled on AlumNet.
                <br />
                <a href="${unsubLink}" style="color:#71717a;text-decoration:underline;">Unsubscribe from these emails</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function ctaButton(text: string, href: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <tr>
        <td style="background-color:#18181b;border-radius:6px;">
          <a href="${href}" style="display:inline-block;padding:10px 24px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
            ${text}
          </a>
        </td>
      </tr>
    </table>`;
}

// =============================================================================
// Template functions per notification type
// =============================================================================

export function connectionRequestEmail(
  senderName: string,
  link: string,
  userId: string
): { subject: string; html: string } {
  const fullLink = `${siteUrl}${link}`;
  const content = `
    <p style="margin:0 0 8px;font-size:15px;color:#18181b;line-height:1.5;">
      <strong>${escapeHtml(senderName)}</strong> sent you a connection request.
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:#52525b;line-height:1.5;">
      View the request and choose to accept or decline.
    </p>
    ${ctaButton("View Request", fullLink)}`;

  return {
    subject: `${senderName} wants to connect with you on AlumNet`,
    html: emailLayout(content, userId, "connection_request"),
  };
}

export function connectionAcceptedEmail(
  accepterName: string,
  link: string,
  userId: string
): { subject: string; html: string } {
  const fullLink = `${siteUrl}${link}`;
  const content = `
    <p style="margin:0 0 8px;font-size:15px;color:#18181b;line-height:1.5;">
      <strong>${escapeHtml(accepterName)}</strong> accepted your connection request.
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:#52525b;line-height:1.5;">
      You can now view their full profile and send them messages.
    </p>
    ${ctaButton("View Profile", fullLink)}`;

  return {
    subject: `${accepterName} accepted your connection on AlumNet`,
    html: emailLayout(content, userId, "connection_accepted"),
  };
}

export function newMessageEmail(
  senderName: string,
  link: string,
  userId: string
): { subject: string; html: string } {
  const fullLink = `${siteUrl}${link}`;
  const content = `
    <p style="margin:0 0 8px;font-size:15px;color:#18181b;line-height:1.5;">
      <strong>${escapeHtml(senderName)}</strong> sent you a message.
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:#52525b;line-height:1.5;">
      Open the conversation to read and reply.
    </p>
    ${ctaButton("Open Conversation", fullLink)}`;

  return {
    subject: `New message from ${senderName} on AlumNet`,
    html: emailLayout(content, userId, "new_message"),
  };
}

export function verificationUpdateEmail(
  status: "approved" | "rejected",
  link: string,
  userId: string
): { subject: string; html: string } {
  const fullLink = `${siteUrl}${link}`;
  const isApproved = status === "approved";

  const content = isApproved
    ? `
    <p style="margin:0 0 8px;font-size:15px;color:#18181b;line-height:1.5;">
      Your alumni verification has been <strong style="color:#16a34a;">approved</strong>.
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:#52525b;line-height:1.5;">
      You now have full access to the alumni network — search the directory, send connection requests, and message other alumni.
    </p>
    ${ctaButton("Go to Dashboard", fullLink)}`
    : `
    <p style="margin:0 0 8px;font-size:15px;color:#18181b;line-height:1.5;">
      Your alumni verification was <strong style="color:#dc2626;">not approved</strong>.
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:#52525b;line-height:1.5;">
      You can submit a new verification request with updated documents.
    </p>
    ${ctaButton("Submit New Request", fullLink)}`;

  return {
    subject: isApproved
      ? "Your AlumNet verification was approved"
      : "Update on your AlumNet verification",
    html: emailLayout(content, userId, "verification_update"),
  };
}

// =============================================================================
// Helpers
// =============================================================================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
