import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export default async function proxy(request: NextRequest) {
  // Skip auth when Supabase isn't configured yet
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do not remove this getUser() call.
  // It refreshes the auth token and is required for Server Components to work.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password");
  const isPublicRoute = pathname === "/" || isAuthRoute;
  const isOnboarding = pathname.startsWith("/onboarding");
  const isAuthCallback = pathname.startsWith("/auth/callback");
  const isBannedPage = pathname === "/banned";
  const isAccountDeletedPage = pathname === "/account-deleted";
  const isStatusPage = isBannedPage || isAccountDeletedPage;

  // Redirect unauthenticated users away from protected routes
  if (!user && !isPublicRoute && !isStatusPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Check if user is banned, suspended, or self-deleted — redirect appropriately
  if (user && !isStatusPage && !isAuthCallback) {
    const { data: userData, error: statusError } = await supabase
      .from("users")
      .select("is_active, suspended_until, deleted_at")
      .eq("id", user.id)
      .single();

    // Fix 4: Fail-closed — if we can't verify user status, redirect to login
    if (statusError) {
      console.error("[Proxy] Failed to fetch user status, redirecting to login", {
        userId: user.id,
        error: statusError.message,
      });
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    if (userData) {
      const isInactive = !userData.is_active;
      const isSelfDeleted = isInactive && userData.deleted_at !== null;
      const isBanned = isInactive && userData.deleted_at === null;
      const isSuspended =
        userData.suspended_until !== null &&
        new Date(userData.suspended_until) > new Date();

      if (isSelfDeleted) {
        const url = request.nextUrl.clone();
        url.pathname = "/account-deleted";
        return NextResponse.redirect(url);
      }

      if (isBanned || isSuspended) {
        const url = request.nextUrl.clone();
        url.pathname = "/banned";
        return NextResponse.redirect(url);
      }
    }

    // If user is on a status page but is no longer restricted, redirect to dashboard
  } else if (user && isStatusPage) {
    const { data: userData } = await supabase
      .from("users")
      .select("is_active, suspended_until, deleted_at")
      .eq("id", user.id)
      .single();

    if (userData) {
      const isInactive = !userData.is_active;
      const isSelfDeleted = isInactive && userData.deleted_at !== null;
      const isBanned = isInactive && userData.deleted_at === null;
      const isSuspended =
        userData.suspended_until !== null &&
        new Date(userData.suspended_until) > new Date();

      // Self-deleted user on /account-deleted is fine — that's where they should be
      if (isSelfDeleted && isAccountDeletedPage) {
        // Allow through
      } else if (isBanned || isSuspended) {
        // Banned/suspended user should be on /banned, not /account-deleted
        if (isAccountDeletedPage) {
          const url = request.nextUrl.clone();
          url.pathname = "/banned";
          return NextResponse.redirect(url);
        }
        // Already on /banned — allow through
      } else {
        // User is active — redirect to dashboard
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  // Redirect authenticated users without a profile to onboarding
  // Skip this check for onboarding page itself, auth callback, banned page, and public routes
  if (user && !isOnboarding && !isAuthCallback && !isPublicRoute && !isBannedPage) {
    const { count, error: profileError } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Fix 4: Fail-closed — if we can't check profile, redirect to login
    if (profileError) {
      console.error("[Proxy] Failed to check profile existence, redirecting to login", {
        userId: user.id,
        error: profileError.message,
      });
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    if (count === 0) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public assets (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
