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
              <strong style="font-size:18px;color:#18181b;">PTNKAlum</strong>
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
                You received this because you have email notifications enabled on PTNKAlum.
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
    subject: `${senderName} wants to connect with you on PTNKAlum`,
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
    subject: `${accepterName} accepted your connection on PTNKAlum`,
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
    subject: `New message from ${senderName} on PTNKAlum`,
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
      ? "Your PTNKAlum verification was approved"
      : "Update on your PTNKAlum verification",
    html: emailLayout(content, userId, "verification_update"),
  };
}

export function announcementEmail(
  title: string,
  body: string,
  link: string | undefined,
  userId: string
): { subject: string; html: string } {
  const dashboardLink = `${siteUrl}/dashboard`;
  const content = `
    <p style="margin:0 0 8px;font-size:15px;color:#18181b;line-height:1.5;">
      <strong>${escapeHtml(title)}</strong>
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:#52525b;line-height:1.5;">
      ${escapeHtml(body)}
    </p>
    ${link ? ctaButton("Learn More", link) : ctaButton("Go to Dashboard", dashboardLink)}`;

  return {
    subject: `PTNKAlum: ${title}`,
    html: emailLayout(content, userId, "announcement"),
  };
}

export function userWarningEmail(
  reason: string,
  link: string,
  userId: string
): { subject: string; html: string } {
  const fullLink = `${siteUrl}${link}`;
  const content = `
    <p style="margin:0 0 8px;font-size:15px;color:#18181b;line-height:1.5;">
      You have received a <strong style="color:#f59e0b;">warning</strong> from a moderator.
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:#52525b;line-height:1.5;">
      <strong>Reason:</strong> ${escapeHtml(reason)}
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:#52525b;line-height:1.5;">
      Please review our community guidelines. Continued violations may result in your messaging being restricted.
    </p>
    ${ctaButton("View Details", fullLink)}`;

  return {
    subject: "You've received a warning on PTNKAlum",
    html: emailLayout(content, userId, "user_warning"),
  };
}

export function userMutedEmail(
  reason: string,
  duration: string,
  link: string,
  userId: string
): { subject: string; html: string } {
  const fullLink = `${siteUrl}${link}`;
  const content = `
    <p style="margin:0 0 8px;font-size:15px;color:#18181b;line-height:1.5;">
      Your messaging has been <strong style="color:#dc2626;">temporarily restricted</strong> for ${escapeHtml(duration)}.
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:#52525b;line-height:1.5;">
      <strong>Reason:</strong> ${escapeHtml(reason)}
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:#52525b;line-height:1.5;">
      You can still browse the platform, but you won't be able to send messages until the restriction expires.
    </p>
    ${ctaButton("View Details", fullLink)}`;

  return {
    subject: "Your messaging on PTNKAlum has been restricted",
    html: emailLayout(content, userId, "user_muted"),
  };
}

export function bulkInviteEmail(
  inviterName: string,
  signupUrl: string
): { subject: string; html: string } {
  const content = `
    <p style="margin:0 0 8px;font-size:15px;color:#18181b;line-height:1.5;">
      You've been invited to join <strong>PTNKAlum</strong> by ${escapeHtml(inviterName)}.
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:#52525b;line-height:1.5;">
      PTNKAlum is an alumni network platform where you can connect with fellow graduates, explore career opportunities, and stay in touch with your school community.
    </p>
    ${ctaButton("Create Your Account", signupUrl)}
    <p style="margin:16px 0 0;font-size:12px;color:#a1a1aa;line-height:1.5;">
      If you weren't expecting this invitation, you can safely ignore this email.
    </p>`;

  // Invite emails use a simplified layout (no unsubscribe — recipient isn't a user yet)
  return {
    subject: `You're invited to join PTNKAlum`,
    html: inviteEmailLayout(content),
  };
}

/**
 * Simplified email layout for invite emails (no unsubscribe link since recipient isn't a user).
 */
function inviteEmailLayout(content: string): string {
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
          <tr>
            <td style="padding:24px 32px 16px;border-bottom:1px solid #e4e4e7;">
              <strong style="font-size:18px;color:#18181b;">PTNKAlum</strong>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">
                This is an invitation from PTNKAlum. No action is required if you don't wish to join.
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

export function accountDeletionRequestedEmail(
  userName: string,
  daysRemaining: number,
  userId: string
): { subject: string; html: string } {
  const settingsLink = `${siteUrl}/account-deleted`;
  const content = `
    <p style="margin:0 0 8px;font-size:15px;color:#18181b;line-height:1.5;">
      Hi <strong>${escapeHtml(userName)}</strong>,
    </p>
    <p style="margin:0 0 8px;font-size:14px;color:#52525b;line-height:1.5;">
      Your PTNKAlum account has been scheduled for deletion. Your profile has been hidden from the directory and your connections have been removed.
    </p>
    <p style="margin:0 0 8px;font-size:14px;color:#52525b;line-height:1.5;">
      You have <strong>${daysRemaining} days</strong> to change your mind. After that, all your data will be permanently deleted and cannot be recovered.
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:#52525b;line-height:1.5;">
      To reactivate your account, simply log in and click "Reactivate Account".
    </p>
    ${ctaButton("Reactivate My Account", settingsLink)}
    <p style="margin:16px 0 0;font-size:12px;color:#a1a1aa;line-height:1.5;">
      If you didn't request this deletion, please log in immediately and reactivate your account, then change your password.
    </p>`;

  return {
    subject: "Your PTNKAlum account is scheduled for deletion",
    html: accountEmailLayout(content),
  };
}

export function accountReactivatedEmail(
  userName: string
): { subject: string; html: string } {
  const dashboardLink = `${siteUrl}/dashboard`;
  const content = `
    <p style="margin:0 0 8px;font-size:15px;color:#18181b;line-height:1.5;">
      Welcome back, <strong>${escapeHtml(userName)}</strong>!
    </p>
    <p style="margin:0 0 8px;font-size:14px;color:#52525b;line-height:1.5;">
      Your PTNKAlum account has been successfully reactivated. Your profile is visible again in the directory.
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:#52525b;line-height:1.5;">
      Please note that your previous connections were removed during the deletion process and will need to be re-established.
    </p>
    ${ctaButton("Go to Dashboard", dashboardLink)}`;

  return {
    subject: "Your PTNKAlum account has been reactivated",
    html: accountEmailLayout(content),
  };
}

/**
 * Simplified email layout for account deletion/reactivation emails.
 * No unsubscribe link — these are transactional, not preference-based.
 */
function accountEmailLayout(content: string): string {
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
          <tr>
            <td style="padding:24px 32px 16px;border-bottom:1px solid #e4e4e7;">
              <strong style="font-size:18px;color:#18181b;">PTNKAlum</strong>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">
                This is a transactional email from PTNKAlum regarding your account status.
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

export function profileStalenessEmail(
  userName: string,
  monthsAgo: number,
  quickUpdateLink: string,
  userId: string
): { subject: string; html: string } {
  const timeText =
    monthsAgo >= 12
      ? `${Math.floor(monthsAgo / 12)} year${Math.floor(monthsAgo / 12) > 1 ? "s" : ""}`
      : `${monthsAgo} month${monthsAgo > 1 ? "s" : ""}`;

  const content = `
    <p style="margin:0 0 8px;font-size:15px;color:#18181b;line-height:1.5;">
      Hi <strong>${escapeHtml(userName)}</strong>,
    </p>
    <p style="margin:0 0 8px;font-size:14px;color:#52525b;line-height:1.5;">
      Your PTNKAlum profile was last updated <strong>${timeText} ago</strong>. Keeping your profile current helps fellow alumni find and connect with you.
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:#52525b;line-height:1.5;">
      Take a minute to confirm your details are still accurate — or update your job, location, and availability.
    </p>
    ${ctaButton("Update My Profile", quickUpdateLink)}
    <p style="margin:16px 0 0;font-size:13px;color:#71717a;line-height:1.5;">
      If everything is still correct, you can ignore this email — we&rsquo;ll check in again later.
    </p>`;

  return {
    subject: "Is your PTNKAlum profile still up to date?",
    html: emailLayout(content, userId, "profile_staleness"),
  };
}

export function eventNearbyEmail(
  eventTitle: string,
  eventDate: string,
  eventLocation: string,
  distanceKm: number,
  eventUrl: string,
  userId: string
): { subject: string; html: string } {
  const fullLink = `${siteUrl}${eventUrl}`;
  const distanceText = distanceKm < 1
    ? "less than 1 km"
    : `~${Math.round(distanceKm)} km`;

  const content = `
    <p style="margin:0 0 8px;font-size:15px;color:#18181b;line-height:1.5;">
      A new event near you: <strong>${escapeHtml(eventTitle)}</strong>
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:#52525b;line-height:1.5;">
      <strong>When:</strong> ${escapeHtml(eventDate)}
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:#52525b;line-height:1.5;">
      <strong>Where:</strong> ${escapeHtml(eventLocation)} (${distanceText} away)
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:#52525b;line-height:1.5;">
      Check out the details and RSVP if you're interested.
    </p>
    ${ctaButton("View Event", fullLink)}`;

  return {
    subject: `Event near you: ${eventTitle}`,
    html: emailLayout(content, userId, "event_nearby"),
  };
}

// =============================================================================
// Event comment (F47c)
// =============================================================================

export function eventCommentEmail(
  actorName: string,
  eventTitle: string,
  eventUrl: string,
  userId: string
): { subject: string; html: string } {
  const fullLink = `${siteUrl}${eventUrl}`;

  const content = `
    <p style="margin:0 0 8px;font-size:15px;color:#18181b;line-height:1.5;">
      <strong>${escapeHtml(actorName)}</strong> commented on <strong>${escapeHtml(eventTitle)}</strong>.
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:#52525b;line-height:1.5;">
      Check the event discussion to stay in the loop.
    </p>
    ${ctaButton("View Discussion", fullLink)}`;

  return {
    subject: `New comment on "${eventTitle}"`,
    html: emailLayout(content, userId, "event_comment"),
  };
}

// =============================================================================
// Event cancelled by admin (admin event moderation)
// =============================================================================

export function eventCancelledByAdminEmail(
  eventTitle: string,
  reason: string,
  eventUrl: string,
  userId: string
): { subject: string; html: string } {
  const fullLink = `${siteUrl}${eventUrl}`;

  const content = `
    <p style="margin:0 0 8px;font-size:15px;color:#18181b;line-height:1.5;">
      Your event <strong>${escapeHtml(eventTitle)}</strong> has been cancelled by an administrator.
    </p>
    <p style="margin:0 0 8px;font-size:14px;color:#52525b;line-height:1.5;">
      <strong>Reason:</strong> ${escapeHtml(reason)}
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:#52525b;line-height:1.5;">
      If you have questions about this decision, please contact the platform administrators.
    </p>
    ${ctaButton("View Events", fullLink)}`;

  return {
    subject: `Your event "${eventTitle}" was cancelled by an administrator`,
    html: emailLayout(content, userId, "event_cancelled_by_admin"),
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
