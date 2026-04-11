/**
 * Integration test helpers for Supabase RPC testing.
 *
 * Provides utilities for creating authenticated test users, seeding fixture
 * data, and cleaning up after tests. Requires local Supabase (`supabase start`).
 *
 * Established by F45a as the first integration-test pattern for the codebase.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Config — reads from the same env vars the app uses (local Supabase)
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Direct Postgres connection for cleanup (cascades through FK)
const DB_URL =
  process.env.SUPABASE_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

if (!SUPABASE_ANON_KEY) {
  throw new Error(
    "Integration tests require NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Ensure .env.local is loaded.",
  );
}

// ---------------------------------------------------------------------------
// Service-role client (bypasses RLS, used for fixture seeding)
// Uses the PostgREST REST API which accepts the sb_secret_ key format.
// ---------------------------------------------------------------------------

let _serviceClient: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (!_serviceClient) {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for fixture seeding.");
    }
    _serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _serviceClient;
}

// ---------------------------------------------------------------------------
// Test user creation — uses signUp (not admin API) for GoTrue compatibility
// ---------------------------------------------------------------------------

export interface TestUser {
  id: string;
  email: string;
  client: SupabaseClient;
}

/**
 * Create an auth user via signUp and return a signed-in Supabase client.
 *
 * Uses the public signup endpoint (auto-confirms in local dev).
 * The `handle_new_user` trigger auto-creates the `public.users` row.
 * The returned client authenticates as this user, so `auth.uid()` works in RPCs.
 */
export async function createTestUser(suffix: string): Promise<TestUser> {
  const email = `test-${suffix}-${Date.now()}@integration.test`;
  const password = "TestPassword123!";

  // Create a fresh client for this user (each client holds its own session)
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // signUp auto-confirms when enable_confirmations = false (local dev default)
  const { data, error } = await client.auth.signUp({ email, password });

  if (error || !data.user) {
    throw new Error(`Failed to create test user '${suffix}': ${error?.message}`);
  }

  // signUp returns a session in local dev (auto-confirm), so we're already signed in
  if (!data.session) {
    // Fallback: sign in explicitly if signUp didn't return a session
    const { error: signInError } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      throw new Error(`Failed to sign in test user '${suffix}': ${signInError.message}`);
    }
  }

  return { id: data.user.id, email, client };
}

// ---------------------------------------------------------------------------
// Fixture seeders (use service client to bypass RLS)
// ---------------------------------------------------------------------------

/**
 * Seed a minimal profile for a test user.
 * `industryId` must be a real ID from the seeded taxonomy.
 */
export async function seedProfile(
  userId: string,
  industryId: string,
  overrides: Record<string, unknown> = {},
): Promise<void> {
  const service = getServiceClient();
  const { error } = await service.from("profiles").insert({
    user_id: userId,
    full_name: `Test User ${userId.slice(0, 8)}`,
    graduation_year: 2020,
    primary_industry_id: industryId,
    profile_completeness: 50,
    last_active_at: new Date().toISOString(),
    ...overrides,
  });
  if (error) throw new Error(`seedProfile(${userId}): ${error.message}`);
}

/**
 * Create an accepted connection between two users.
 */
export async function seedConnection(userA: string, userB: string): Promise<void> {
  const service = getServiceClient();
  const { error } = await service.from("connections").insert({
    requester_id: userA,
    receiver_id: userB,
    status: "accepted",
  });
  if (error) throw new Error(`seedConnection: ${error.message}`);
}

/**
 * Create a conversation between two users with optional messages.
 *
 * @param senders - Which side(s) have sent messages: "none", "a-only", "b-only", "both"
 */
export async function seedConversation(
  userA: string,
  userB: string,
  senders: "none" | "a-only" | "b-only" | "both" = "none",
): Promise<string> {
  const service = getServiceClient();

  // Compute user_pair the same way the DB function does
  const userPair =
    userA < userB ? `${userA}:${userB}` : `${userB}:${userA}`;

  const { data: convo, error: convoErr } = await service
    .from("conversations")
    .insert({ user_pair: userPair })
    .select("id")
    .single();

  if (convoErr) throw new Error(`seedConversation: ${convoErr.message}`);

  // Add participants
  const { error: partErr } = await service.from("conversation_participants").insert([
    { conversation_id: convo.id, user_id: userA },
    { conversation_id: convo.id, user_id: userB },
  ]);
  if (partErr) throw new Error(`seedConversation participants: ${partErr.message}`);

  // Seed messages based on `senders`
  const messages: { conversation_id: string; sender_id: string; content: string }[] = [];

  if (senders === "a-only" || senders === "both") {
    messages.push({ conversation_id: convo.id, sender_id: userA, content: "Hello from A" });
  }
  if (senders === "b-only" || senders === "both") {
    messages.push({ conversation_id: convo.id, sender_id: userB, content: "Hello from B" });
  }

  if (messages.length > 0) {
    const { error: msgErr } = await service.from("messages").insert(messages);
    if (msgErr) throw new Error(`seedConversation messages: ${msgErr.message}`);
  }

  return convo.id;
}

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/** Fetch the first industry ID from the seeded taxonomy. */
export async function getAnyIndustryId(): Promise<string> {
  const service = getServiceClient();
  const { data, error } = await service
    .from("industries")
    .select("id")
    .limit(1)
    .single();

  if (error || !data) throw new Error(`getAnyIndustryId: ${error?.message}`);
  return data.id;
}

// ---------------------------------------------------------------------------
// Cleanup — direct Postgres to delete auth users (cascades everything)
// ---------------------------------------------------------------------------

/**
 * Delete test auth users via direct Postgres DELETE on auth.users.
 * FK cascades handle public.users, profiles, connections, etc.
 */
export async function cleanupTestUsers(userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;

  // Dynamic import to avoid requiring pg as a hard dependency for non-test code
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: DB_URL });

  try {
    const placeholders = userIds.map((_, i) => `$${i + 1}`).join(", ");
    // Delete tables that FK to public.users without CASCADE first
    await pool.query(
      `DELETE FROM public.connections WHERE requester_id::text = ANY($1) OR receiver_id::text = ANY($1)`,
      [userIds],
    );
    // Now delete auth.users — FKs with CASCADE handle the rest
    await pool.query(
      `DELETE FROM auth.users WHERE id IN (${placeholders})`,
      userIds,
    );
  } finally {
    await pool.end();
  }
}
