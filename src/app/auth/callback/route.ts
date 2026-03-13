import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Auth callback handler for Supabase email flows (password reset, email
 * verification). Uses manual cookie management on the NextResponse so that
 * session cookies survive the redirect (cookies() from next/headers sets
 * cookies on the implicit response, which are lost when returning an
 * explicit NextResponse.redirect()).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as
    | "signup"
    | "recovery"
    | "invite"
    | "email"
    | null;
  const next = searchParams.get("next") ?? "/dashboard";

  // Create a redirect response upfront so we can attach cookies to it
  const redirectUrl = new URL(next, origin);
  let response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Flow 1: PKCE code exchange
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
    console.error("[AuthCallback] Code exchange failed", {
      code: code.substring(0, 8) + "...",
      error: error.message,
    });
  }

  // Flow 2: Token hash verification (from custom email templates)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error) {
      return response;
    }
    console.error("[AuthCallback] Token hash verification failed", {
      type,
      error: error.message,
    });
  }

  // If both flows fail, redirect to login with email_confirmed flag
  // (Supabase confirms the email server-side before redirecting here,
  // so the email IS confirmed even if session creation fails)
  console.error("[AuthCallback] All flows failed, redirecting to login", {
    hasCode: !!code,
    hasTokenHash: !!tokenHash,
    type,
  });
  const loginUrl = new URL("/login", origin);
  if (code || tokenHash) {
    loginUrl.searchParams.set("email_confirmed", "true");
  }
  return NextResponse.redirect(loginUrl);
}
