"use server";

import { z } from "zod/v4";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/notifications";
import type { ActionResult } from "@/lib/types";

/**
 * Send a connection request to another user.
 */
export async function sendConnectionRequest(
  receiverId: string,
  message?: string
): Promise<ActionResult> {
  const schema = z.object({
    receiverId: z.string().uuid("Invalid user ID"),
    message: z
      .string()
      .max(500, "Message must be under 500 characters")
      .optional(),
  });

  const parsed = schema.safeParse({ receiverId, message });
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

  if (user.id === receiverId) {
    return { success: false, error: "You cannot connect with yourself." };
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
      error: "You must be verified to send connection requests.",
    };
  }

  // Check target user exists and is active
  const { data: targetUser } = await supabase
    .from("users")
    .select("id, is_active")
    .eq("id", receiverId)
    .single();

  if (!targetUser || !targetUser.is_active) {
    return { success: false, error: "This user is not available." };
  }

  // Check for existing block (either direction)
  const { data: myBlock } = await supabase
    .from("blocks")
    .select("id")
    .eq("blocker_id", user.id)
    .eq("blocked_id", receiverId)
    .maybeSingle();

  if (myBlock) {
    return {
      success: false,
      error: "You have blocked this user. Unblock them first to connect.",
    };
  }

  // Check if they blocked us — use service role or just try insert and catch
  // Since we can't read their blocks via RLS, we rely on the insert failing
  // if there's a conflict, and check for existing connections first.

  // Check for existing connection (either direction)
  const { data: existingConnection } = await supabase
    .from("connections")
    .select("id, status, requester_id")
    .or(
      `and(requester_id.eq.${user.id},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${user.id})`
    )
    .maybeSingle();

  if (existingConnection) {
    if (existingConnection.status === "accepted") {
      return { success: false, error: "You are already connected." };
    }
    if (existingConnection.status === "pending") {
      if (existingConnection.requester_id === user.id) {
        return {
          success: false,
          error: "You already have a pending request to this user.",
        };
      }
      return {
        success: false,
        error:
          "This user has already sent you a request. Check your pending requests.",
      };
    }
    // Status is "rejected" — delete it so they can re-request
    await supabase
      .from("connections")
      .delete()
      .eq("id", existingConnection.id);
  }

  try {
    const { error: insertError } = await supabase
      .from("connections")
      .insert({
        requester_id: user.id,
        receiver_id: receiverId,
        message: parsed.data.message ?? null,
      });

    if (insertError) {
      console.error("[ServerAction:sendConnectionRequest]", {
        userId: user.id,
        receiverId,
        error: insertError.message,
      });
      return {
        success: false,
        error: "Failed to send connection request. Please try again.",
      };
    }

    // Send notification to the receiver (fire-and-forget)
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();

    const senderName = senderProfile?.full_name ?? "Someone";
    notifyUser(
      receiverId,
      "connection_request",
      "New connection request",
      `${senderName} sent you a connection request.`,
      "/connections",
      { actorName: senderName }
    );

    revalidatePath("/connections");
    revalidatePath(`/profile/${receiverId}`);
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:sendConnectionRequest]", {
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
 * Accept a pending connection request.
 */
export async function acceptConnectionRequest(
  connectionId: string
): Promise<ActionResult> {
  const parsed = z.string().uuid("Invalid connection ID").safeParse(connectionId);
  if (!parsed.success) {
    return { success: false, error: "Invalid connection ID." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  // Fetch the connection — RLS ensures we can only see our own
  const { data: connection } = await supabase
    .from("connections")
    .select("id, requester_id, receiver_id, status")
    .eq("id", connectionId)
    .single();

  if (!connection) {
    return { success: false, error: "Connection request not found." };
  }

  if (connection.receiver_id !== user.id) {
    return {
      success: false,
      error: "You can only accept requests sent to you.",
    };
  }

  if (connection.status !== "pending") {
    return {
      success: false,
      error: "This request has already been processed.",
    };
  }

  try {
    const { error: updateError } = await supabase
      .from("connections")
      .update({ status: "accepted" })
      .eq("id", connectionId);

    if (updateError) {
      console.error("[ServerAction:acceptConnectionRequest]", {
        userId: user.id,
        connectionId,
        error: updateError.message,
      });
      return {
        success: false,
        error: "Failed to accept request. Please try again.",
      };
    }

    // Notify the requester that their request was accepted (fire-and-forget)
    const { data: acceptorProfile } = await supabase
      .from("profiles")
      .select("full_name, id")
      .eq("user_id", user.id)
      .single();

    const acceptorName = acceptorProfile?.full_name ?? "Someone";
    const profileLink = acceptorProfile?.id
      ? `/profile/${acceptorProfile.id}`
      : "/connections";
    notifyUser(
      connection.requester_id,
      "connection_accepted",
      "Connection accepted",
      `${acceptorName} accepted your connection request.`,
      profileLink,
      { actorName: acceptorName }
    );

    revalidatePath("/connections");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:acceptConnectionRequest]", {
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
 * Reject a pending connection request.
 */
export async function rejectConnectionRequest(
  connectionId: string
): Promise<ActionResult> {
  const parsed = z.string().uuid("Invalid connection ID").safeParse(connectionId);
  if (!parsed.success) {
    return { success: false, error: "Invalid connection ID." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const { data: connection } = await supabase
    .from("connections")
    .select("id, receiver_id, status")
    .eq("id", connectionId)
    .single();

  if (!connection) {
    return { success: false, error: "Connection request not found." };
  }

  if (connection.receiver_id !== user.id) {
    return {
      success: false,
      error: "You can only reject requests sent to you.",
    };
  }

  if (connection.status !== "pending") {
    return {
      success: false,
      error: "This request has already been processed.",
    };
  }

  try {
    const { error: updateError } = await supabase
      .from("connections")
      .update({ status: "rejected" })
      .eq("id", connectionId);

    if (updateError) {
      console.error("[ServerAction:rejectConnectionRequest]", {
        userId: user.id,
        connectionId,
        error: updateError.message,
      });
      return {
        success: false,
        error: "Failed to reject request. Please try again.",
      };
    }

    revalidatePath("/connections");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:rejectConnectionRequest]", {
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
 * Disconnect from a connected user or cancel a sent request.
 */
export async function disconnectUser(
  connectionId: string
): Promise<ActionResult> {
  const parsed = z.string().uuid("Invalid connection ID").safeParse(connectionId);
  if (!parsed.success) {
    return { success: false, error: "Invalid connection ID." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const { data: connection } = await supabase
    .from("connections")
    .select("id, requester_id, receiver_id")
    .eq("id", connectionId)
    .single();

  if (!connection) {
    return { success: false, error: "Connection not found." };
  }

  if (
    connection.requester_id !== user.id &&
    connection.receiver_id !== user.id
  ) {
    return { success: false, error: "You are not part of this connection." };
  }

  try {
    const { error: deleteError } = await supabase
      .from("connections")
      .delete()
      .eq("id", connectionId);

    if (deleteError) {
      console.error("[ServerAction:disconnectUser]", {
        userId: user.id,
        connectionId,
        error: deleteError.message,
      });
      return {
        success: false,
        error: "Failed to disconnect. Please try again.",
      };
    }

    revalidatePath("/connections");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:disconnectUser]", {
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
 * Block another user. Also removes any existing connection.
 */
export async function blockUser(
  blockedId: string
): Promise<ActionResult> {
  const parsed = z.string().uuid("Invalid user ID").safeParse(blockedId);
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

  if (user.id === blockedId) {
    return { success: false, error: "You cannot block yourself." };
  }

  // Check not already blocked
  const { data: existingBlock } = await supabase
    .from("blocks")
    .select("id")
    .eq("blocker_id", user.id)
    .eq("blocked_id", blockedId)
    .maybeSingle();

  if (existingBlock) {
    return { success: false, error: "You have already blocked this user." };
  }

  try {
    // Remove any existing connection (either direction)
    await supabase
      .from("connections")
      .delete()
      .or(
        `and(requester_id.eq.${user.id},receiver_id.eq.${blockedId}),and(requester_id.eq.${blockedId},receiver_id.eq.${user.id})`
      );

    // Insert the block
    const { error: blockError } = await supabase
      .from("blocks")
      .insert({ blocker_id: user.id, blocked_id: blockedId });

    if (blockError) {
      console.error("[ServerAction:blockUser]", {
        userId: user.id,
        blockedId,
        error: blockError.message,
      });
      return {
        success: false,
        error: "Failed to block user. Please try again.",
      };
    }

    revalidatePath("/connections");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:blockUser]", {
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
 * Unblock a previously blocked user.
 */
export async function unblockUser(
  blockId: string
): Promise<ActionResult> {
  const parsed = z.string().uuid("Invalid block ID").safeParse(blockId);
  if (!parsed.success) {
    return { success: false, error: "Invalid block ID." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const { data: block } = await supabase
    .from("blocks")
    .select("id, blocker_id")
    .eq("id", blockId)
    .single();

  if (!block) {
    return { success: false, error: "Block not found." };
  }

  if (block.blocker_id !== user.id) {
    return { success: false, error: "You can only remove your own blocks." };
  }

  try {
    const { error: deleteError } = await supabase
      .from("blocks")
      .delete()
      .eq("id", blockId);

    if (deleteError) {
      console.error("[ServerAction:unblockUser]", {
        userId: user.id,
        blockId,
        error: deleteError.message,
      });
      return {
        success: false,
        error: "Failed to unblock user. Please try again.",
      };
    }

    revalidatePath("/connections");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:unblockUser]", {
      userId: user.id,
      error: message,
    });
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}
