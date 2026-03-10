"use server";

import { createClient } from "@/lib/supabase/server";

export interface AnalyticsData {
  userStatusBreakdown: { status: string; count: number }[];
  signupsOverTime: { month: string; count: number }[];
  activeUsers: { dau: number; wau: number; mau: number };
  connectionsOverTime: { month: string; count: number }[];
  messagesOverTime: { month: string; count: number }[];
  topIndustries: { name: string; count: number }[];
  topLocations: { name: string; count: number }[];
  totalUsers: number;
}

function getLast12Months(): { month: string; label: string }[] {
  const months: { month: string; label: string }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = d.toISOString().slice(0, 7); // "YYYY-MM"
    const label = d.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
    months.push({ month, label });
  }
  return months;
}

function fillMonthlyGaps(
  data: { month: string; count: number }[],
  months: { month: string; label: string }[]
): { month: string; count: number }[] {
  const map = new Map(data.map((d) => [d.month, d.count]));
  return months.map((m) => ({
    month: m.label,
    count: map.get(m.month) ?? 0,
  }));
}

export async function getAnalyticsData(): Promise<AnalyticsData> {
  const supabase = await createClient();

  const months = getLast12Months();
  const startDate = `${months[0].month}-01`;

  // Run all queries in parallel
  const [
    statusResult,
    signupsResult,
    dauResult,
    wauResult,
    mauResult,
    connectionsResult,
    messagesResult,
    industriesResult,
    locationsResult,
    totalResult,
  ] = await Promise.all([
    // 1. User status breakdown
    supabase.rpc("get_user_status_counts"),

    // 2. Signups over time (last 12 months)
    supabase.rpc("get_signups_over_time", { start_date: startDate }),

    // 3. Active users - DAU
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte(
        "last_active_at",
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      ),

    // 3. Active users - WAU
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte(
        "last_active_at",
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      ),

    // 3. Active users - MAU
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte(
        "last_active_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      ),

    // 4. Connections over time
    supabase.rpc("get_connections_over_time", { start_date: startDate }),

    // 5. Messages over time
    supabase.rpc("get_messages_over_time", { start_date: startDate }),

    // 6. Top industries
    supabase.rpc("get_top_industries", { limit_count: 10 }),

    // 7. Top locations
    supabase.rpc("get_top_locations", { limit_count: 10 }),

    // Total users
    supabase.from("users").select("id", { count: "exact", head: true }),
  ]);

  // Process user status breakdown
  const userStatusBreakdown = (
    (statusResult.data as { status: string; count: number }[]) ?? []
  ).map((r) => ({
    status: r.status,
    count: Number(r.count),
  }));

  // Process signups over time with gap filling
  const rawSignups = (
    (signupsResult.data as { month: string; count: number }[]) ?? []
  ).map((r) => ({
    month: r.month.slice(0, 7),
    count: Number(r.count),
  }));
  const signupsOverTime = fillMonthlyGaps(rawSignups, months);

  // Process connections over time with gap filling
  const rawConnections = (
    (connectionsResult.data as { month: string; count: number }[]) ?? []
  ).map((r) => ({
    month: r.month.slice(0, 7),
    count: Number(r.count),
  }));
  const connectionsOverTime = fillMonthlyGaps(rawConnections, months);

  // Process messages over time with gap filling
  const rawMessages = (
    (messagesResult.data as { month: string; count: number }[]) ?? []
  ).map((r) => ({
    month: r.month.slice(0, 7),
    count: Number(r.count),
  }));
  const messagesOverTime = fillMonthlyGaps(rawMessages, months);

  // Process top industries
  const topIndustries = (
    (industriesResult.data as { name: string; count: number }[]) ?? []
  ).map((r) => ({
    name: r.name,
    count: Number(r.count),
  }));

  // Process top locations
  const topLocations = (
    (locationsResult.data as { name: string; count: number }[]) ?? []
  ).map((r) => ({
    name: r.name,
    count: Number(r.count),
  }));

  return {
    userStatusBreakdown,
    signupsOverTime,
    activeUsers: {
      dau: dauResult.count ?? 0,
      wau: wauResult.count ?? 0,
      mau: mauResult.count ?? 0,
    },
    connectionsOverTime,
    messagesOverTime,
    topIndustries,
    topLocations,
    totalUsers: totalResult.count ?? 0,
  };
}
