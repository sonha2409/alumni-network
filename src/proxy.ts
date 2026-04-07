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

  // Handle PKCE code exchange: if a `code` param is present on any route,
  // exchange it for a session before proceeding. This handles cases where
  // Supabase redirects to the site root or /login instead of /auth/callback.
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Strip code/next params and redirect to the intended destination
      const url = request.nextUrl.clone();
      url.searchParams.delete("code");
      url.searchParams.delete("next");
      url.pathname = next ?? "/dashboard";
      const redirectResponse = NextResponse.redirect(url);
      // Copy session cookies from supabaseResponse onto the redirect —
      // without this, the cookies set by exchangeCodeForSession are lost
      // because NextResponse.redirect() creates a new response object.
      for (const cookie of supabaseResponse.cookies.getAll()) {
        redirectResponse.cookies.set(cookie);
      }
      return redirectResponse;
    }
    console.error("[Proxy] Code exchange failed", { error: error.message });

    // PKCE exchange failed (likely missing code_verifier cookie — user opened
    // the confirmation link in a different browser context). The email IS
    // confirmed server-side by Supabase before it redirects here, so redirect
    // to /login with a flag so the login page can show a success message.
    const url = request.nextUrl.clone();
    url.searchParams.delete("code");
    url.searchParams.delete("next");
    url.pathname = "/login";
    url.searchParams.set("email_confirmed", "true");
    const failRedirect = NextResponse.redirect(url);
    for (const cookie of supabaseResponse.cookies.getAll()) {
      failRedirect.cookies.set(cookie);
    }
    return failRedirect;
  }

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
  const isResetPassword = pathname.startsWith("/reset-password");
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
  // P4: Combined user status + profile existence into a single query for non-status pages
  if (user && !isStatusPage && !isAuthCallback) {
    const { data: userData, error: statusError } = await supabase
      .from("users")
      .select("is_active, suspended_until, deleted_at, profiles(id)")
      .eq("id", user.id)
      .single();

    // Fix 4: Fail-closed — if we can't verify user status, sign out and redirect to login.
    // Sign out prevents redirect loop (session exists → proxy redirects from /login → no user row → loop).
    if (statusError) {
      console.error("[Proxy] Failed to fetch user status, signing out and redirecting to login", {
        userId: user.id,
        error: statusError.message,
      });
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    if (userData) {
      // F45: fire-and-forget last-seen touch. The RPC self-throttles with a
      // 1-minute WHERE clause, so this is effectively free for fresh users.
      // Not awaited → no added latency. Placed inside the status branch so we
      // skip the write entirely for the auth-callback / status-page paths.
      void supabase.rpc("touch_last_seen");

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

      // Redirect authenticated users without a profile to onboarding
      // Skip for onboarding page itself, reset-password, and public routes
      if (!isOnboarding && !isResetPassword && !isPublicRoute && !isBannedPage) {
        const hasProfile = Array.isArray(userData.profiles)
          ? userData.profiles.length > 0
          : !!userData.profiles;

        if (!hasProfile) {
          const url = request.nextUrl.clone();
          url.pathname = "/onboarding";
          return NextResponse.redirect(url);
        }
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
