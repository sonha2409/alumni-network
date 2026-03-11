"use server";

import { randomUUID } from "crypto";
import { z } from "zod/v4";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { checkMessageRateLimit, checkConversationRateLimit } from "@/lib/rate-limit";
import { findExistingConversation } from "@/lib/queries/messages";
import { notifyUser } from "@/lib/notifications";
import type {
  ActionResult,
  AttachmentInput,
  AttachmentWithSender,
  Message,
  RateLimitInfo,
} from "@/lib/types";
import {
  ALLOWED_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES_PER_MESSAGE,
  STORAGE_QUOTA_BYTES,
  isImageType,
} from "@/lib/attachments";

/**
 * Get or create a 1-on-1 conversation with a connected user.
 * Returns the conversation ID.
 */
export async function getOrCreateConversation(
  otherUserId: string
): Promise<ActionResult<{ conversationId: string; rateLimitInfo?: RateLimitInfo }>> {
  const parsed = z.string().uuid("Invalid user ID").safeParse(otherUserId);
  if (!parsed.success) {
    return { success: false, error: "Invalid user ID." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  if (user.id === otherUserId) {
    return { success: false, error: "You cannot message yourself." };
  }

  // Check current user is verified
  const { data: currentUser } = await supabase
    .from("users")
    .select("verification_status, is_active")
    .eq("id", user.id)
    .single();

  if (!currentUser || currentUser.verification_status !== "verified") {
    return {
      success: false,
      error: "You must be verified to send messages.",
    };
  }

  // Check target user exists and is active
  const { data: targetUser } = await supabase
    .from("users")
    .select("id, is_active")
    .eq("id", otherUserId)
    .single();

  if (!targetUser || !targetUser.is_active) {
    return { success: false, error: "This user is not available." };
  }

  // Check connection exists (must be connected to message)
  const { data: connection } = await supabase
    .from("connections")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},receiver_id.eq.${user.id})`
    )
    .maybeSingle();

  if (!connection) {
    return {
      success: false,
      error: "You can only message users you are connected with.",
    };
  }

  // Check for existing block
  const { data: block } = await supabase
    .from("blocks")
    .select("id")
    .or(
      `and(blocker_id.eq.${user.id},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${user.id})`
    )
    .maybeSingle();

  if (block) {
    return { success: false, error: "Unable to message this user." };
  }

  // Check if conversation already exists
  const existingConvId = await findExistingConversation(user.id, otherUserId);
  if (existingConvId) {
    return { success: true, data: { conversationId: existingConvId } };
  }

  // Check conversation rate limit (only for new conversations)
  const rateLimitInfo = await checkConversationRateLimit(user.id);
  if (!rateLimitInfo.allowed) {
    return {
      success: false,
      error: `You've reached your daily limit for new conversations. Resets at ${new Date(rateLimitInfo.resetsAt).toLocaleTimeString()}.`,
    };
  }

  try {
    // Create conversation with a pre-generated ID
    // (We generate the UUID server-side because the INSERT RLS policy
    // passes WITH CHECK, but the SELECT policy requires the user to be
    // a participant — which doesn't exist yet. So we can't use RETURNING.)
    const conversationId = randomUUID();

    const { error: convError } = await supabase
      .from("conversations")
      .insert({ id: conversationId });

    if (convError) {
      console.error("[ServerAction:getOrCreateConversation]", {
        userId: user.id,
        otherUserId,
        error: convError.message,
      });
      return {
        success: false,
        error: "Failed to create conversation. Please try again.",
      };
    }

    // Add both participants
    const { error: participantError } = await supabase
      .from("conversation_participants")
      .insert([
        { conversation_id: conversationId, user_id: user.id },
        { conversation_id: conversationId, user_id: otherUserId },
      ]);

    if (participantError) {
      console.error("[ServerAction:getOrCreateConversation]", {
        userId: user.id,
        otherUserId,
        error: participantError.message,
      });
      return {
        success: false,
        error: "Failed to create conversation. Please try again.",
      };
    }

    revalidatePath("/messages");
    return {
      success: true,
      data: { conversationId, rateLimitInfo },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:getOrCreateConversation]", {
      userId: user.id,
      error: message,
    });
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}

/**
 * Check the current user's storage quota usage for message attachments.
 */
export async function checkStorageQuota(): Promise<
  ActionResult<{ usedBytes: number; limitBytes: number; remainingBytes: number }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  try {
    const { data, error } = await supabase.rpc("get_user_storage_used", {
      uid: user.id,
    });

    if (error) {
      console.error("[ServerAction:checkStorageQuota]", {
        userId: user.id,
        error: error.message,
      });
      return { success: false, error: "Failed to check storage quota." };
    }

    const usedBytes = Number(data) || 0;
    return {
      success: true,
      data: {
        usedBytes,
        limitBytes: STORAGE_QUOTA_BYTES,
        remainingBytes: Math.max(0, STORAGE_QUOTA_BYTES - usedBytes),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:checkStorageQuota]", {
      userId: user.id,
      error: message,
    });
    return { success: false, error: "Something went wrong." };
  }
}

/**
 * Get attachments for a conversation (for the media panel).
 */
export async function getConversationAttachments(
  conversationId: string,
  filter?: "image" | "document" | null,
  cursor?: string | null,
  limit: number = 20
): Promise<ActionResult<{ attachments: AttachmentWithSender[]; hasMore: boolean }>> {
  const parsed = z
    .string()
    .uuid("Invalid conversation ID")
    .safeParse(conversationId);
  if (!parsed.success) {
    return { success: false, error: "Invalid conversation ID." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  try {
    const { data, error } = await supabase.rpc("get_conversation_attachments", {
      p_conversation_id: conversationId,
      p_attachment_type: filter ?? null,
      p_cursor: cursor ?? null,
      p_limit: limit + 1,
    });

    if (error) {
      console.error("[ServerAction:getConversationAttachments]", {
        userId: user.id,
        conversationId,
        error: error.message,
      });
      return { success: false, error: "Failed to load attachments." };
    }

    const rows = (data ?? []) as Array<{
      id: string;
      message_id: string;
      uploader_id: string;
      file_name: string;
      file_path: string;
      file_size: number;
      content_type: string;
      attachment_type: "image" | "document";
      width: number | null;
      height: number | null;
      created_at: string;
      sender_name: string;
    }>;

    const hasMore = rows.length > limit;
    const sliced = hasMore ? rows.slice(0, limit) : rows;

    // Generate signed URLs
    const attachments: AttachmentWithSender[] = await Promise.all(
      sliced.map(async (row) => {
        const { data: signedData } = await supabase.storage
          .from("message-attachments")
          .createSignedUrl(row.file_path, 3600);

        return {
          id: row.id,
          message_id: row.message_id,
          uploader_id: row.uploader_id,
          file_name: row.file_name,
          file_path: row.file_path,
          file_size: row.file_size,
          content_type: row.content_type,
          attachment_type: row.attachment_type,
          width: row.width,
          height: row.height,
          is_deleted: false,
          deleted_at: null,
          created_at: row.created_at,
          updated_at: row.created_at,
          signed_url: signedData?.signedUrl ?? null,
          sender_name: row.sender_name,
        };
      })
    );

    return { success: true, data: { attachments, hasMore } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:getConversationAttachments]", {
      userId: user.id,
      error: message,
    });
    return { success: false, error: "Something went wrong." };
  }
}

/**
 * Send a message in a conversation, optionally with file attachments.
 */
export async function sendMessage(
  conversationId: string,
  content: string,
  attachments?: AttachmentInput[]
): Promise<ActionResult<{ message: Message; rateLimitInfo: RateLimitInfo }>> {
  const hasAttachments = attachments && attachments.length > 0;

  const schema = z.object({
    conversationId: z.string().uuid("Invalid conversation ID"),
    content: hasAttachments
      ? z.string().max(5000, "Message must be under 5000 characters")
      : z
          .string()
          .min(1, "Message cannot be empty")
          .max(5000, "Message must be under 5000 characters"),
  });

  const parsed = schema.safeParse({ conversationId, content });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  // Validate attachments if provided
  if (hasAttachments) {
    if (attachments.length > MAX_FILES_PER_MESSAGE) {
      return {
        success: false,
        error: `Maximum ${MAX_FILES_PER_MESSAGE} files per message.`,
      };
    }
    for (const att of attachments) {
      if (!ALLOWED_TYPES.includes(att.contentType)) {
        return {
          success: false,
          error: `File type not allowed: ${att.fileName}`,
        };
      }
      if (att.fileSize > MAX_FILE_SIZE) {
        return {
          success: false,
          error: `File too large: ${att.fileName} (max 5MB)`,
        };
      }
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  // Check if user is muted
  const { data: muteData } = await supabase
    .from("users")
    .select("muted_until")
    .eq("id", user.id)
    .single();

  if (muteData?.muted_until && new Date(muteData.muted_until) > new Date()) {
    const mutedUntil = new Date(muteData.muted_until).toLocaleDateString();
    return {
      success: false,
      error: `Your messaging is temporarily restricted until ${mutedUntil}.`,
    };
  }

  // Check rate limit
  const rateLimitInfo = await checkMessageRateLimit(user.id);
  if (!rateLimitInfo.allowed) {
    return {
      success: false,
      error: `You've reached your daily message limit (${rateLimitInfo.limit}). Resets at ${new Date(rateLimitInfo.resetsAt).toLocaleTimeString()}.`,
    };
  }

  // Verify user is a participant (RLS also enforces this)
  const { data: participation } = await supabase
    .from("conversation_participants")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!participation) {
    return { success: false, error: "You are not part of this conversation." };
  }

  // Check if the other participant is still connected
  const { data: otherParticipant } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .neq("user_id", user.id)
    .maybeSingle();

  if (otherParticipant) {
    const { data: connectionExists } = await supabase
      .from("connections")
      .select("id")
      .eq("status", "accepted")
      .or(
        `and(requester_id.eq.${user.id},receiver_id.eq.${otherParticipant.user_id}),and(requester_id.eq.${otherParticipant.user_id},receiver_id.eq.${user.id})`
      )
      .maybeSingle();

    if (!connectionExists) {
      return {
        success: false,
        error: "You are no longer connected with this user.",
      };
    }
  }

  // Validate attachment file paths start with user's folder
  if (hasAttachments) {
    for (const att of attachments) {
      if (!att.filePath.startsWith(`${user.id}/`)) {
        return {
          success: false,
          error: "Invalid file path.",
        };
      }
    }

    // Check storage quota
    const { data: usedData, error: quotaError } = await supabase.rpc(
      "get_user_storage_used",
      { uid: user.id }
    );
    if (quotaError) {
      console.error("[ServerAction:sendMessage]", {
        userId: user.id,
        error: quotaError.message,
      });
      return { success: false, error: "Failed to check storage quota." };
    }

    const totalNewSize = attachments.reduce((sum, a) => sum + a.fileSize, 0);
    if ((Number(usedData) || 0) + totalNewSize > STORAGE_QUOTA_BYTES) {
      return {
        success: false,
        error: "Storage quota exceeded (25MB limit). Delete old files to free space.",
      };
    }
  }

  try {
    // Insert message
    const { data: message, error: msgError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: parsed.data.content.trim(),
      })
      .select("*")
      .single();

    if (msgError || !message) {
      console.error("[ServerAction:sendMessage]", {
        userId: user.id,
        conversationId,
        error: msgError?.message,
      });
      return {
        success: false,
        error: "Failed to send message. Please try again.",
      };
    }

    // Insert attachment rows if present
    if (hasAttachments) {
      const attachmentRows = attachments.map((att) => ({
        message_id: message.id,
        uploader_id: user.id,
        file_name: att.fileName,
        file_path: att.filePath,
        file_size: att.fileSize,
        content_type: att.contentType,
        attachment_type: att.attachmentType,
        width: att.width ?? null,
        height: att.height ?? null,
      }));

      const { error: attError } = await supabase
        .from("message_attachments")
        .insert(attachmentRows);

      if (attError) {
        console.error("[ServerAction:sendMessage] attachment insert", {
          userId: user.id,
          messageId: message.id,
          error: attError.message,
        });
        // Message was sent but attachments failed — don't fail the whole action
      }
    }

    // Build conversation preview
    let preview: string;
    const trimmedContent = parsed.data.content.trim();
    if (trimmedContent) {
      preview =
        trimmedContent.length > 100
          ? trimmedContent.slice(0, 100) + "..."
          : trimmedContent;
    } else if (hasAttachments) {
      const firstAtt = attachments[0];
      preview = isImageType(firstAtt.contentType)
        ? "\ud83d\udcf7 Photo"
        : `\ud83d\udcce ${firstAtt.fileName}`;
    } else {
      preview = "";
    }

    // Update conversation metadata
    await supabase
      .from("conversations")
      .update({
        last_message_at: message.created_at,
        last_message_preview: preview,
      })
      .eq("id", conversationId);

    // Update sender's last_read_at (they've seen their own message)
    await supabase
      .from("conversation_participants")
      .update({ last_read_at: message.created_at })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);

    // Decrement remaining after successful send
    const updatedRateLimitInfo: RateLimitInfo = {
      ...rateLimitInfo,
      remaining: Math.max(0, rateLimitInfo.remaining - 1),
    };

    // Notify the other participant about the new message (fire-and-forget)
    if (otherParticipant) {
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      const senderName = senderProfile?.full_name ?? "Someone";
      const notifPreview = trimmedContent
        ? trimmedContent.length > 80
          ? trimmedContent.slice(0, 80) + "..."
          : trimmedContent
        : preview;

      notifyUser(
        otherParticipant.user_id,
        "new_message",
        `New message from ${senderName}`,
        notifPreview,
        `/messages?conversation=${conversationId}`,
        { actorName: senderName }
      );
    }

    revalidatePath("/messages");
    return {
      success: true,
      data: { message: message as Message, rateLimitInfo: updatedRateLimitInfo },
    };
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:sendMessage]", {
      userId: user.id,
      error: errMessage,
    });
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}

/**
 * Mark a conversation as read (update last_read_at to now).
 */
export async function markConversationRead(
  conversationId: string
): Promise<ActionResult> {
  const parsed = z
    .string()
    .uuid("Invalid conversation ID")
    .safeParse(conversationId);
  if (!parsed.success) {
    return { success: false, error: "Invalid conversation ID." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  try {
    const { error } = await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[ServerAction:markConversationRead]", {
        userId: user.id,
        conversationId,
        error: error.message,
      });
      return { success: false, error: "Failed to mark as read." };
    }

    revalidatePath("/messages");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:markConversationRead]", {
      userId: user.id,
      error: message,
    });
    return { success: false, error: "Something went wrong." };
  }
}

/**
 * Edit a message (only by sender, within 15 minutes).
 */
export async function editMessage(
  messageId: string,
  content: string
): Promise<ActionResult<{ message: Message }>> {
  const schema = z.object({
    messageId: z.string().uuid("Invalid message ID"),
    content: z
      .string()
      .min(1, "Message cannot be empty")
      .max(5000, "Message must be under 5000 characters"),
  });

  const parsed = schema.safeParse({ messageId, content });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  // Fetch the message
  const { data: existingMessage } = await supabase
    .from("messages")
    .select("id, sender_id, created_at, is_deleted")
    .eq("id", messageId)
    .single();

  if (!existingMessage) {
    return { success: false, error: "Message not found." };
  }

  if (existingMessage.sender_id !== user.id) {
    return { success: false, error: "You can only edit your own messages." };
  }

  if (existingMessage.is_deleted) {
    return { success: false, error: "Cannot edit a deleted message." };
  }

  // Check 15-minute edit window
  const createdAt = new Date(existingMessage.created_at);
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  if (createdAt < fifteenMinutesAgo) {
    return {
      success: false,
      error: "Messages can only be edited within 15 minutes of sending.",
    };
  }

  try {
    const { data: updatedMessage, error } = await supabase
      .from("messages")
      .update({
        content: parsed.data.content.trim(),
        is_edited: true,
        edited_at: new Date().toISOString(),
      })
      .eq("id", messageId)
      .select("*")
      .single();

    if (error || !updatedMessage) {
      console.error("[ServerAction:editMessage]", {
        userId: user.id,
        messageId,
        error: error?.message,
      });
      return { success: false, error: "Failed to edit message." };
    }

    revalidatePath("/messages");
    return { success: true, data: { message: updatedMessage as Message } };
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:editMessage]", {
      userId: user.id,
      error: errMessage,
    });
    return { success: false, error: "Something went wrong." };
  }
}

/**
 * Soft-delete a message (only by sender).
 */
export async function deleteMessage(
  messageId: string
): Promise<ActionResult> {
  const parsed = z.string().uuid("Invalid message ID").safeParse(messageId);
  if (!parsed.success) {
    return { success: false, error: "Invalid message ID." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const { data: message } = await supabase
    .from("messages")
    .select("id, sender_id, is_deleted")
    .eq("id", messageId)
    .single();

  if (!message) {
    return { success: false, error: "Message not found." };
  }

  if (message.sender_id !== user.id) {
    return { success: false, error: "You can only delete your own messages." };
  }

  if (message.is_deleted) {
    return { success: false, error: "Message already deleted." };
  }

  try {
    const { error } = await supabase
      .from("messages")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        content: "",
      })
      .eq("id", messageId);

    if (error) {
      console.error("[ServerAction:deleteMessage]", {
        userId: user.id,
        messageId,
        error: error.message,
      });
      return { success: false, error: "Failed to delete message." };
    }

    // Soft-delete associated attachments
    await supabase
      .from("message_attachments")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq("message_id", messageId)
      .eq("uploader_id", user.id);

    revalidatePath("/messages");
    return { success: true, data: undefined };
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:deleteMessage]", {
      userId: user.id,
      error: errMessage,
    });
    return { success: false, error: "Something went wrong." };
  }
}

/**
 * Report a message to moderators.
 */
export async function reportMessage(
  messageId: string,
  reason: string
): Promise<ActionResult> {
  const schema = z.object({
    messageId: z.string().uuid("Invalid message ID"),
    reason: z
      .string()
      .min(10, "Please provide a reason (at least 10 characters)")
      .max(1000, "Reason must be under 1000 characters"),
  });

  const parsed = schema.safeParse({ messageId, reason });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  // Verify the message exists and user is in the conversation
  const { data: message } = await supabase
    .from("messages")
    .select("id, sender_id, conversation_id")
    .eq("id", messageId)
    .single();

  if (!message) {
    return { success: false, error: "Message not found." };
  }

  if (message.sender_id === user.id) {
    return { success: false, error: "You cannot report your own messages." };
  }

  try {
    const { error } = await supabase.from("message_reports").insert({
      message_id: messageId,
      reporter_id: user.id,
      reason: parsed.data.reason.trim(),
    });

    if (error) {
      if (error.code === "23505") {
        // Unique constraint violation
        return {
          success: false,
          error: "You have already reported this message.",
        };
      }
      console.error("[ServerAction:reportMessage]", {
        userId: user.id,
        messageId,
        error: error.message,
      });
      return { success: false, error: "Failed to submit report." };
    }

    return { success: true, data: undefined };
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:reportMessage]", {
      userId: user.id,
      error: errMessage,
    });
    return { success: false, error: "Something went wrong." };
  }
}

/**
 * Toggle mute status for a conversation.
 */
export async function toggleMuteConversation(
  conversationId: string
): Promise<ActionResult<{ is_muted: boolean }>> {
  const parsed = z
    .string()
    .uuid("Invalid conversation ID")
    .safeParse(conversationId);
  if (!parsed.success) {
    return { success: false, error: "Invalid conversation ID." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  // Get current mute status
  const { data: participation } = await supabase
    .from("conversation_participants")
    .select("id, is_muted")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!participation) {
    return { success: false, error: "You are not part of this conversation." };
  }

  try {
    const newMuted = !participation.is_muted;
    const { error } = await supabase
      .from("conversation_participants")
      .update({ is_muted: newMuted })
      .eq("id", participation.id);

    if (error) {
      console.error("[ServerAction:toggleMuteConversation]", {
        userId: user.id,
        conversationId,
        error: error.message,
      });
      return { success: false, error: "Failed to update mute status." };
    }

    revalidatePath("/messages");
    return { success: true, data: { is_muted: newMuted } };
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:toggleMuteConversation]", {
      userId: user.id,
      error: errMessage,
    });
    return { success: false, error: "Something went wrong." };
  }
}
