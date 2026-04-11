/**
 * F45a — Integration tests for the `can_see_last_seen()` SQL gate.
 *
 * Tests the 7 visibility scenarios defined in SPEC.md (Feature 45a).
 * Requires local Supabase running (`supabase start`).
 *
 * Run: npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  TestUser,
  createTestUser,
  seedProfile,
  seedConnection,
  seedConversation,
  getAnyIndustryId,
  cleanupTestUsers,
  getServiceClient,
} from "./integration-helpers";

// ---------------------------------------------------------------------------
// Test users & fixture state
// ---------------------------------------------------------------------------

let viewer: TestUser;
let connectedNoMsgs: TestUser;
let connectedViewerSent: TestUser;
let connectedTargetSent: TestUser;
let connectedBothSent: TestUser;
let hiddenUser: TestUser;
let stranger: TestUser;

let industryId: string;
const allUserIds: string[] = [];

// ---------------------------------------------------------------------------
// Setup — create users, profiles, connections, conversations, messages
// ---------------------------------------------------------------------------

beforeAll(async () => {
  industryId = await getAnyIndustryId();

  // Create all 7 users in parallel
  [
    viewer,
    connectedNoMsgs,
    connectedViewerSent,
    connectedTargetSent,
    connectedBothSent,
    hiddenUser,
    stranger,
  ] = await Promise.all([
    createTestUser("viewer"),
    createTestUser("connected-no-msgs"),
    createTestUser("connected-viewer-sent"),
    createTestUser("connected-target-sent"),
    createTestUser("connected-both-sent"),
    createTestUser("hidden-user"),
    createTestUser("stranger"),
  ]);

  allUserIds.push(
    viewer.id,
    connectedNoMsgs.id,
    connectedViewerSent.id,
    connectedTargetSent.id,
    connectedBothSent.id,
    hiddenUser.id,
    stranger.id,
  );

  // Seed profiles for all users
  await Promise.all(
    allUserIds.map((id) =>
      seedProfile(id, industryId, {
        // hiddenUser has show_last_active = false
        ...(id === hiddenUser.id ? { show_last_active: false } : {}),
      }),
    ),
  );

  // Seed connections (viewer ↔ each target except stranger)
  await Promise.all([
    seedConnection(viewer.id, connectedNoMsgs.id),
    seedConnection(viewer.id, connectedViewerSent.id),
    seedConnection(viewer.id, connectedTargetSent.id),
    seedConnection(viewer.id, connectedBothSent.id),
    seedConnection(viewer.id, hiddenUser.id),
  ]);

  // Seed conversations with appropriate message patterns
  await Promise.all([
    // connectedNoMsgs: conversation exists but no messages
    seedConversation(viewer.id, connectedNoMsgs.id, "none"),
    // connectedViewerSent: only viewer sent messages
    seedConversation(viewer.id, connectedViewerSent.id, "a-only"),
    // connectedTargetSent: only target sent messages
    seedConversation(viewer.id, connectedTargetSent.id, "b-only"),
    // connectedBothSent: both sides sent messages
    seedConversation(viewer.id, connectedBothSent.id, "both"),
    // hiddenUser: both sent messages but target hides last seen
    seedConversation(viewer.id, hiddenUser.id, "both"),
  ]);
}, 30_000);

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

afterAll(async () => {
  await cleanupTestUsers(allUserIds);
}, 15_000);

// ---------------------------------------------------------------------------
// Helper — call can_see_last_seen as a specific user
// ---------------------------------------------------------------------------

async function callGate(caller: TestUser, targetId: string): Promise<boolean> {
  const { data, error } = await caller.client.rpc("can_see_last_seen", {
    p_target: targetId,
  });
  if (error) throw new Error(`can_see_last_seen RPC error: ${error.message}`);
  return data as boolean;
}

async function callGetLastSeen(
  caller: TestUser,
  targetId: string,
): Promise<string | null> {
  const { data, error } = await caller.client.rpc("get_last_seen", {
    p_target: targetId,
  });
  if (error) throw new Error(`get_last_seen RPC error: ${error.message}`);
  return data as string | null;
}

// ---------------------------------------------------------------------------
// Tests — 7 scenarios from SPEC.md Feature 45a
// ---------------------------------------------------------------------------

describe("can_see_last_seen() gate", () => {
  it("should_return_true_when_viewing_own_profile", async () => {
    const result = await callGate(viewer, viewer.id);
    expect(result).toBe(true);
  });

  it("should_return_false_when_connected_but_no_messages", async () => {
    const result = await callGate(viewer, connectedNoMsgs.id);
    expect(result).toBe(false);
  });

  it("should_return_false_when_connected_and_only_viewer_sent_messages", async () => {
    const result = await callGate(viewer, connectedViewerSent.id);
    expect(result).toBe(false);
  });

  it("should_return_false_when_connected_and_only_target_sent_messages", async () => {
    const result = await callGate(viewer, connectedTargetSent.id);
    expect(result).toBe(false);
  });

  it("should_return_true_when_connected_and_both_sent_messages", async () => {
    const result = await callGate(viewer, connectedBothSent.id);
    expect(result).toBe(true);
  });

  it("should_return_false_when_target_has_show_last_active_disabled", async () => {
    const result = await callGate(viewer, hiddenUser.id);
    expect(result).toBe(false);
  });

  it("should_return_false_when_not_connected", async () => {
    const result = await callGate(viewer, stranger.id);
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// get_last_seen() RPC — verifies the gate integrates correctly
// ---------------------------------------------------------------------------

describe("get_last_seen() RPC", () => {
  it("should_return_timestamp_when_gate_passes", async () => {
    const result = await callGetLastSeen(viewer, connectedBothSent.id);
    expect(result).not.toBeNull();
    // Verify it's a valid ISO timestamp
    expect(new Date(result!).getTime()).not.toBeNaN();
  });

  it("should_return_null_when_gate_fails", async () => {
    const result = await callGetLastSeen(viewer, hiddenUser.id);
    expect(result).toBeNull();
  });

  it("should_return_timestamp_for_own_profile", async () => {
    const result = await callGetLastSeen(viewer, viewer.id);
    expect(result).not.toBeNull();
  });

  it("should_return_null_for_stranger", async () => {
    const result = await callGetLastSeen(viewer, stranger.id);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("can_see_last_seen() edge cases", () => {
  it("should_return_false_for_unauthenticated_caller", async () => {
    // Create a client with no auth session (anon)
    const { createClient } = await import("@supabase/supabase-js");
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data, error } = await anonClient.rpc("can_see_last_seen", {
      p_target: connectedBothSent.id,
    });
    // Unauthenticated users can't call the function (REVOKE ALL FROM public)
    // This should either return false or error
    if (error) {
      expect(error.message).toContain("permission denied");
    } else {
      expect(data).toBe(false);
    }
  });

  it("should_ignore_deleted_messages_when_evaluating_gate", async () => {
    // Create two new users where both sent messages, but then one message is soft-deleted
    const userA = await createTestUser("deleted-msg-a");
    const userB = await createTestUser("deleted-msg-b");
    allUserIds.push(userA.id, userB.id);

    await Promise.all([
      seedProfile(userA.id, industryId),
      seedProfile(userB.id, industryId),
    ]);
    await seedConnection(userA.id, userB.id);
    const convoId = await seedConversation(userA.id, userB.id, "both");

    // Verify gate passes before deletion
    const before = await callGate(userA, userB.id);
    expect(before).toBe(true);

    // Soft-delete all of userA's messages in this conversation
    const service = getServiceClient();
    await service
      .from("messages")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("conversation_id", convoId)
      .eq("sender_id", userA.id);

    // Gate should now fail — userA has no non-deleted messages
    const after = await callGate(userA, userB.id);
    expect(after).toBe(false);
  });
});
