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
  /** For announcement: the announcement body text */
  announcementBody?: string;
  /** For user_warning / user_muted: the reason text */
  moderationReason?: string;
  /** For user_muted: human-readable duration (e.g., "7 days") */
  muteDuration?: string;
  /** For event_nearby: event details */
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  eventDistanceKm?: number;
}

/**
 * Create a grouped notification for a user (in-app + email).
 * Uses `upsert_message_notification` to merge repeated notifications
 * of the same type+link into a single row with an incrementing count.
 *
 * Email is only sent when the notification is newly created (not when
 * an existing unread notification is updated), which naturally debounces
 * email delivery for rapid-fire events like chat messages.
 *
 * Fire-and-forget — errors are logged but don't propagate.
 */
export async function notifyUserGrouped(
  userId: string,
  type: NotificationType,
  actorName: string,
  body: string,
  link: string,
  emailContext?: NotifyEmailContext
): Promise<void> {
  let isNew = true;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("upsert_message_notification", {
      p_user_id: userId,
      p_type: type,
      p_actor_name: actorName,
      p_body: body,
      p_link: link,
    });

    if (error) {
      console.error("[notifyUserGrouped]", {
        userId,
        type,
        error: error.message,
      });
      return;
    }

    // RPC returns [{notification_id, is_new}]
    if (data && Array.isArray(data) && data.length > 0) {
      isNew = data[0].is_new;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[notifyUserGrouped]", { userId, type, error: message });
    return;
  }

  // Only send email for NEW notifications (not updates to existing groups)
  if (isNew && emailContext) {
    sendEmailNotification(userId, type, link, emailContext).catch((err) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[notifyUserGrouped:email]", {
        userId,
        type,
        error: message,
      });
    });
  }
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
    announcementEmail,
    userWarningEmail,
    userMutedEmail,
    accountDeletionRequestedEmail,
    accountReactivatedEmail,
    eventNearbyEmail,
    eventCommentEmail,
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
      return announcementEmail(
        context.actorName ?? "Announcement",
        context.announcementBody ?? "",
        link,
        userId
      );
    case "user_warning":
      return userWarningEmail(
        context.moderationReason ?? "Community guidelines violation",
        notificationLink,
        userId
      );
    case "user_muted":
      return userMutedEmail(
        context.moderationReason ?? "Community guidelines violation",
        context.muteDuration ?? "a period of time",
        notificationLink,
        userId
      );
    case "account_deletion":
      return accountDeletionRequestedEmail(
        context.actorName ?? "User",
        30,
        userId
      );
    case "account_reactivated":
      return accountReactivatedEmail(context.actorName ?? "User");
    case "event_nearby":
      return eventNearbyEmail(
        context.eventTitle ?? "New Event",
        context.eventDate ?? "",
        context.eventLocation ?? "",
        context.eventDistanceKm ?? 0,
        notificationLink,
        userId
      );
    case "event_comment":
      return eventCommentEmail(
        actorName,
        context.eventTitle ?? "an event",
        notificationLink,
        userId
      );
    default:
      return null;
  }
}
