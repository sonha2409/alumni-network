import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth callback handler for Supabase email flows (password reset, email
 * verification). Handles two flows:
 * 1. PKCE code exchange (code param) — used by Supabase's default email links
 * 2. Token hash verification (token_hash + type params) — used by custom email templates
 */
export async function GET(request: Request) {
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

  const supabase = await createClient();

  // Flow 1: PKCE code exchange
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
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
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[AuthCallback] Token hash verification failed", {
      type,
      error: error.message,
    });
  }

  // If both flows fail, redirect to login
  console.error("[AuthCallback] All flows failed, redirecting to login", {
    hasCode: !!code,
    hasTokenHash: !!tokenHash,
    type,
  });
  return NextResponse.redirect(`${origin}/login`);
}
