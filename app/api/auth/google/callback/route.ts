/**
 * 🎓 GOOGLE OAUTH — STEP 2: HANDLE THE CALLBACK
 *
 * Google redirects the browser back here with a one-time `code`. We:
 * 1. Verify `state` matches the cookie we set in step 1 (CSRF check).
 * 2. Exchange `code` for tokens, then fetch the user's Google profile.
 * 3. Find or create the matching User account (linking by email if one
 *    already exists), and log them in exactly like the password flow does.
 */

import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { sendLoginNotificationEmail } from "@/lib/mail";
import { describeDevice } from "@/lib/device";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";

function failRedirect(req: NextRequest) {
  return NextResponse.redirect(new URL("/login?error=google_auth_failed", req.url));
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("google_oauth_state")?.value;
  cookieStore.delete("google_oauth_state");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (!code || !state || !expectedState || state !== expectedState) {
    return failRedirect(req);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return failRedirect(req);
  }

  try {
    const redirectUri = new URL("/api/auth/google/callback", req.url).toString();

    // ─── Exchange the authorization code for an access token ───
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) return failRedirect(req);
    const tokens = await tokenRes.json();

    // ─── Fetch the user's Google profile ───
    const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) return failRedirect(req);

    const profile = await profileRes.json() as {
      sub: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };

    if (!profile.email) return failRedirect(req);

    await connectDB();

    // ─── Find or create the User account ───
    let user = await User.findOne({ googleId: profile.sub });

    if (!user) {
      user = await User.findOne({ email: profile.email.toLowerCase().trim() });
      if (user) {
        // Existing password-based account with the same email — link it.
        user.googleId = profile.sub;
        if (!user.isEmailVerified) user.isEmailVerified = true;
      } else {
        user = new User({
          googleId: profile.sub,
          name: profile.name || profile.email.split("@")[0],
          email: profile.email.toLowerCase().trim(),
          isEmailVerified: true,
          profileImage: profile.picture || "",
        });
      }
    }

    // ─── Create the same encrypted session cookie the password flow uses ───
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    session.userId = user._id.toString();
    session.name = user.name;
    session.email = user.email;
    session.role = "user";
    session.isLoggedIn = true;
    await session.save();

    const userAgent = req.headers.get("user-agent") || "Unknown Device";
    user.lastLoginAt = new Date();
    user.lastLoginDevice = describeDevice(userAgent);
    await user.save();

    await sendLoginNotificationEmail(user.email, user.name, "user", userAgent);

    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch (error: unknown) {
    console.error("Google OAuth callback error:", error);
    return failRedirect(req);
  }
}
