/**
 * 🎓 GOOGLE OAUTH — STEP 1: START THE FLOW
 *
 * Redirects the browser to Google's account picker (the same "Sign in with
 * ___ with google.com" screen you see on other sites). We attach a random
 * `state` value, also stashed in a short-lived cookie, so the callback can
 * confirm the response actually came from a redirect we initiated (CSRF
 * protection for the OAuth handshake).
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", req.url));
  }

  const state = crypto.randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 5, // 5 minutes
    path: "/",
  });

  const redirectUri = new URL("/api/auth/google/callback", req.url).toString();

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");
  authUrl.searchParams.set("access_type", "online");

  return NextResponse.redirect(authUrl);
}
