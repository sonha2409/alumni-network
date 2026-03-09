import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/queries/profiles";
import { getPendingReceivedCount } from "@/lib/queries/connections";
import { MainNavbarClient } from "./main-navbar-client";

export interface NavbarUserData {
  email: string;
  role: "user" | "moderator" | "admin";
  fullName: string | null;
  photoUrl: string | null;
  profileId: string | null;
  pendingConnectionCount: number;
}

export async function MainNavbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch role from public.users
  const { data: publicUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  // Fetch profile for avatar and name + pending connection count
  const [profile, pendingConnectionCount] = await Promise.all([
    getProfileByUserId(user.id),
    getPendingReceivedCount(user.id),
  ]);

  const userData: NavbarUserData = {
    email: user.email ?? "",
    role: (publicUser?.role as NavbarUserData["role"]) ?? "user",
    fullName: profile?.full_name ?? null,
    photoUrl: profile?.photo_url ?? null,
    profileId: profile?.id ?? null,
    pendingConnectionCount,
  };

  return <MainNavbarClient user={userData} />;
}
