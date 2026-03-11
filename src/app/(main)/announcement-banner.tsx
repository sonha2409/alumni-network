import { createClient } from "@/lib/supabase/server";
import { AnnouncementBannerClient } from "./announcement-banner-client";

export async function AnnouncementBanner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch the most recent active announcement that the user hasn't dismissed
  const { data: announcement, error } = await supabase
    .from("announcements")
    .select("id, title, body, link, published_at")
    .eq("is_active", true)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !announcement) return null;

  // Check if user already dismissed this announcement
  const { data: dismissal } = await supabase
    .from("dismissed_announcements")
    .select("id")
    .eq("user_id", user.id)
    .eq("announcement_id", announcement.id)
    .maybeSingle();

  if (dismissal) return null;

  return (
    <AnnouncementBannerClient
      id={announcement.id}
      title={announcement.title}
      body={announcement.body}
      link={announcement.link}
    />
  );
}
