import { createClient } from "@/lib/supabase/server";
import type { NotificationType } from "@/lib/types";
import { sendEmail } from "@/lib/email";
import { isEmailEnabled, getUserEmail } from "@/lib/queries/notification-preferences";

/**
 * Metadata passed to notifyUser for building email templates.
 * Optional — if not provided, no email is sent.
 */
export interface NotifyEmailContext {
  /** Display name of the actor (e.g., who sent the request) */
  actorName?: string;
  /** For verification_update: "approved" | "rejected" */
  verificationStatus?: "approved" | "rejected";
}

/**
 * Create a notification for a user (in-app + email).
 * Uses the SECURITY DEFINER `create_notification` function
 * so that notifications can only be created server-side.
 *
 * This is a fire-and-forget helper — errors are logged but don't
 * propagate to the caller. Notification failures should never
 * block the primary action (e.g., sending a connection request).
 */
export async function notifyUser(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string,
  emailContext?: NotifyEmailContext
): Promise<void> {
  // In-app notification (existing behavior)
  try {
    const supabase = await createClient();

    const { error } = await supabase.rpc("create_notification", {
      p_user_id: userId,
      p_type: type,
      p_title: title,
      p_body: body,
      p_link: link ?? null,
    });

    if (error) {
      console.error("[notifyUser]", {
        userId,
        type,
        error: error.message,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[notifyUser]", { userId, type, error: message });
  }

  // Email notification (new behavior, fire-and-forget)
  if (emailContext) {
    sendEmailNotification(userId, type, link, emailContext).catch((err) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[notifyUser:email]", { userId, type, error: message });
    });
  }
}

/**
 * Check preferences and send an email notification if enabled.
 */
async function sendEmailNotification(
  userId: string,
  type: NotificationType,
  link: string | undefined,
  context: NotifyEmailContext
): Promise<void> {
  // Check if user has email enabled for this type
  const enabled = await isEmailEnabled(userId, type);
  if (!enabled) return;

  // Get the user's email
  const email = await getUserEmail(userId);
  if (!email) return;

  // Build the email template
  const template = await buildEmailTemplate(type, link, context, userId);
  if (!template) return;

  await sendEmail(email, template.subject, template.html);
}

/**
 * Build an email template based on notification type and context.
 */
async function buildEmailTemplate(
  type: NotificationType,
  link: string | undefined,
  context: NotifyEmailContext,
  userId: string
): Promise<{ subject: string; html: string } | null> {
  const {
    connectionRequestEmail,
    connectionAcceptedEmail,
    newMessageEmail,
    verificationUpdateEmail,
  } = await import("@/lib/email-templates");

  const notificationLink = link ?? "/dashboard";
  const actorName = context.actorName ?? "Someone";

  switch (type) {
    case "connection_request":
      return connectionRequestEmail(actorName, notificationLink, userId);
    case "connection_accepted":
      return connectionAcceptedEmail(actorName, notificationLink, userId);
    case "new_message":
      return newMessageEmail(actorName, notificationLink, userId);
    case "verification_update":
      return verificationUpdateEmail(
        context.verificationStatus ?? "approved",
        notificationLink,
        userId
      );
    case "announcement":
      // Announcements don't have email templates yet
      return null;
    default:
      return null;
  }
}
