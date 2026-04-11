"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/notifications";
import { isEmailEnabled } from "@/lib/queries/notification-preferences";
import type { ActionResult } from "@/lib/types";

const MAX_GROUP_MEMBERS = 100;
const RATE_LIMIT_DAYS = 7;
const DAILY_EMAIL_CAP = 80;
const DAILY_EMAIL_KEY = "event_nearby"; // shared budget with F47b
const BATCH_SIZE = 3;

interface BulkInviteResult {
  invited: number;
  skipped: number;
}

export async function bulkInviteGroupMembers(
  eventId: string
): Promise<ActionResult<BulkInviteResult>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "You must be logged in." };

    // Verified check
    const { data: me } = await supabase
      .from("users")
      .select("verification_status")
      .eq("id", user.id)
      .single();
    if (!me || me.verification_status !== "verified") {
      return { success: false, error: "You must be verified." };
    }

    // Load event with group_id
    const { data: event } = await supabase
      .from("events")
      .select("id, title, group_id, creator_id")
      .eq("id", eventId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!event) return { success: false, error: "Event not found." };
    if (!event.group_id) {
      return { success: false, error: "This event is not linked to a group." };
    }

    // Host check
    const { data: isHost } = await supabase.rpc("is_event_host", {
      p_event_id: eventId,
      p_user_id: user.id,
    });
    if (!isHost) {
      return { success: false, error: "Only hosts can bulk-invite." };
    }

    // Role check: must be owner or moderator of the linked group
    const { data: myMembership } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", event.group_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!myMembership || !["owner", "moderator"].includes(myMembership.role)) {
      return {
        success: false,
        error: "Only group owners or moderators can bulk-invite.",
      };
    }

    // Member count cap
    const { count: memberCount } = await supabase
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", event.group_id);

    if ((memberCount ?? 0) > MAX_GROUP_MEMBERS) {
      return {
        success: false,
        error: `Groups with more than ${MAX_GROUP_MEMBERS} members cannot use bulk-invite. Use the individual invite picker instead.`,
      };
    }

    // 7-day rate limit
    const weekAgo = new Date(
      Date.now() - RATE_LIMIT_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    const { count: recentBulkCount } = await supabase
      .from("group_bulk_invite_log")
      .select("id", { count: "exact", head: true })
      .eq("group_id", event.group_id)
      .gte("created_at", weekAgo);

    if ((recentBulkCount ?? 0) > 0) {
      return {
        success: false,
        error: "Bulk invite can only be used once per group every 7 days.",
      };
    }

    // Fetch all group members
    const { data: members } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", event.group_id);

    const memberIds = (members ?? []).map((m) => m.user_id);

    // Exclude: event creator, already-invited users, blocked users
    const { data: existingInvites } = await supabase
      .from("event_invites")
      .select("invitee_id")
      .eq("event_id", eventId);
    const alreadyInvited = new Set(
      (existingInvites ?? []).map((i) => i.invitee_id)
    );

    // Fetch blocks (users who blocked the event creator)
    const { data: blocks } = await supabase
      .from("blocks")
      .select("blocker_id, blocked_id")
      .or(
        `blocker_id.eq.${event.creator_id},blocked_id.eq.${event.creator_id}`
      );
    const blockedSet = new Set<string>();
    for (const b of blocks ?? []) {
      blockedSet.add(
        b.blocker_id === event.creator_id ? b.blocked_id : b.blocker_id
      );
    }

    const eligible = memberIds.filter(
      (id) =>
        id !== event.creator_id &&
        !alreadyInvited.has(id) &&
        !blockedSet.has(id)
    );

    if (eligible.length === 0) {
      return {
        success: true,
        data: { invited: 0, skipped: memberIds.length },
      };
    }

    // Insert invites
    const { error: insertErr } = await supabase.from("event_invites").insert(
      eligible.map((invitee_id) => ({
        event_id: eventId,
        invitee_id,
        invited_by: user.id,
      }))
    );

    if (insertErr) {
      console.error("[ServerAction:bulkInviteGroupMembers]", {
        userId: user.id,
        eventId,
        error: insertErr.message,
      });
      return { success: false, error: "Failed to send invites." };
    }

    // Log the bulk invite for rate limiting
    await supabase.from("group_bulk_invite_log").insert({
      group_id: event.group_id,
      event_id: eventId,
      invited_by: user.id,
      member_count: eligible.length,
    });

    // Fire-and-forget: notifications with email (respecting shared 80/day cap)
    void (async () => {
      try {
        const { data: dailyCount } = await supabase.rpc("get_email_counter", {
          p_counter_key: DAILY_EMAIL_KEY,
        });
        let currentDailyCount = (dailyCount as number) ?? 0;
        let batchCount = 0;

        for (const uid of eligible) {
          const body = `You've been invited to "${event.title}" via your group.`;
          const link = `/events/${eventId}`;

          let sendEmail = false;
          if (currentDailyCount < DAILY_EMAIL_CAP) {
            const emailEnabled = await isEmailEnabled(uid, "event_invite");
            if (emailEnabled) {
              sendEmail = true;
            }
          }

          if (sendEmail) {
            await supabase.rpc("increment_email_counter", {
              p_counter_key: DAILY_EMAIL_KEY,
            });
            currentDailyCount++;
            batchCount++;
            if (batchCount >= BATCH_SIZE) {
              await new Promise((r) => setTimeout(r, 1000));
              batchCount = 0;
            }

            await notifyUser(
              uid,
              "event_invite",
              `You're invited: ${event.title}`,
              body,
              link,
              { eventTitle: event.title }
            );
          } else {
            await notifyUser(
              uid,
              "event_invite",
              `You're invited: ${event.title}`,
              body,
              link
            );
          }
        }
      } catch (err) {
        console.error("[events:bulkInviteNotifications]", {
          eventId,
          error: (err as Error).message,
        });
      }
    })();

    revalidatePath(`/events/${eventId}`);
    return {
      success: true,
      data: {
        invited: eligible.length,
        skipped: memberIds.length - eligible.length,
      },
    };
  } catch (err) {
    console.error("[ServerAction:bulkInviteGroupMembers]", {
      eventId,
      error: (err as Error).message,
    });
    return { success: false, error: "Something went wrong." };
  }
}
