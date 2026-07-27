/**
 * APPLE OAUTH — STEP 1: START THE FLOW
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const clientId = process.env.APPLE_CLIENT_ID;
  const role = req.nextUrl.searchParams.get("role") === "vendor" ? "vendor" : "user";
  const intent = req.nextUrl.searchParams.get("intent") === "signup" ? "signup" : "login";

  if (!clientId) {
    const page = intent === "signup" ? "/signup" : "/login";
    return NextResponse.redirect(new URL(`${page}?role=${role}&error=apple_not_configured`, req.url));
  }

  const state = crypto.randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("apple_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 5,
    path: "/",
  });
  cookieStore.set("apple_oauth_role", role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 5,
    path: "/",
  });
  cookieStore.set("apple_oauth_intent", intent, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 5,
    path: "/",
  });

  const redirectUri = new URL("/api/auth/apple/callback", req.url).toString();

  const authUrl = new URL("https://appleid.apple.com/auth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code id_token");
  authUrl.searchParams.set("response_mode", "form_post");
  authUrl.searchParams.set("scope", "name email");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl);
}
