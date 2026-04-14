import type { MetadataRoute } from "next";

import { createServiceClient } from "@/lib/supabase/service";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ptnkalum.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServiceClient();

  // Fetch public events (upcoming + recent past 90 days) for crawlability
  const ninetyDaysAgo = new Date(
    Date.now() - 90 * 24 * 60 * 60 * 1000
  ).toISOString();
  const { data: events } = await supabase
    .from("events")
    .select("id, updated_at, start_time")
    .is("deleted_at", null)
    .eq("is_public", true)
    .gte("start_time", ninetyDaysAgo)
    .order("start_time", { ascending: false })
    .limit(200);

  const eventEntries: MetadataRoute.Sitemap = (events ?? []).map((event) => ({
    url: `${siteUrl}/events/${event.id}`,
    lastModified: new Date(event.updated_at),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    ...eventEntries,
  ];
}
