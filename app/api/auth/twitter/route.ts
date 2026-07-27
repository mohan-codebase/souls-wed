/**
 * TWITTER (X) OAUTH 2.0 — STEP 1: START THE FLOW
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const role = req.nextUrl.searchParams.get("role") === "vendor" ? "vendor" : "user";
  const intent = req.nextUrl.searchParams.get("intent") === "signup" ? "signup" : "login";

  if (!clientId) {
    const page = intent === "signup" ? "/signup" : "/login";
    return NextResponse.redirect(new URL(`${page}?role=${role}&error=twitter_not_configured`, req.url));
  }

  const state = crypto.randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("twitter_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 5,
    path: "/",
  });
  cookieStore.set("twitter_oauth_role", role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 5,
    path: "/",
  });
  cookieStore.set("twitter_oauth_intent", intent, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 5,
    path: "/",
  });

  const redirectUri = new URL("/api/auth/twitter/callback", req.url).toString();

  const authUrl = new URL("https://twitter.com/i/oauth2/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "tweet.read users.read offline.access");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", "challenge");
  authUrl.searchParams.set("code_challenge_method", "plain");

  return NextResponse.redirect(authUrl);
}
