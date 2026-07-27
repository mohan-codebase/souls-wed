/**
 * GOOGLE OAUTH — STEP 2: HANDLE THE CALLBACK
 *
 * Google redirects the browser back here with a one-time `code`. We:
 * 1. Verify `state` matches the cookie we set in step 1 (CSRF check).
 * 2. Exchange `code` for tokens, then fetch the user's Google profile.
 * 3. For users: find or create the matching User account (linking by email
 *    if one already exists), and log them in exactly like the password
 *    flow does. For vendors: link/log in to an EXISTING vendor account
 *    matched by email. If none exists and this was a signup attempt,
 *    stash the verified Google identity in a short-lived cookie and send
 *    them to fill in business details (city, category, business name)
 *    that Google's profile can't supply — Vendor.create happens there.
 */

import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { Vendor } from "@/lib/models/Vendor";
import { sendLoginNotificationEmail } from "@/lib/mail";
import { describeDevice } from "@/lib/device";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions, PendingVendorSignupData, pendingVendorSignupSessionOptions } from "@/lib/session";

function failRedirect(req: NextRequest, role: "user" | "vendor", error = "google_auth_failed") {
  return NextResponse.redirect(new URL(`/login?role=${role}&error=${error}`, req.url));
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("google_oauth_state")?.value;
  const role: "user" | "vendor" = cookieStore.get("google_oauth_role")?.value === "vendor" ? "vendor" : "user";
  const intent: "signup" | "login" = cookieStore.get("google_oauth_intent")?.value === "signup" ? "signup" : "login";
  cookieStore.delete("google_oauth_state");
  cookieStore.delete("google_oauth_role");
  cookieStore.delete("google_oauth_intent");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (!code || !state || !expectedState || state !== expectedState) {
    return failRedirect(req, role);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return failRedirect(req, role);
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

    if (!tokenRes.ok) return failRedirect(req, role);
    const tokens = await tokenRes.json();

    // ─── Fetch the user's Google profile ───
    const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) return failRedirect(req, role);

    const profile = await profileRes.json() as {
      sub: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };

    if (!profile.email) return failRedirect(req, role);

    await connectDB();
    const email = profile.email.toLowerCase().trim();

    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    const userAgent = req.headers.get("user-agent") || "Unknown Device";

    if (role === "vendor") {
      // ─── Vendor: link/log in to an EXISTING account only ───
      let vendor = await Vendor.findOne({ googleId: profile.sub });
      if (!vendor) {
        vendor = await Vendor.findOne({ email });
        if (!vendor) {
          if (intent === "signup") {
            // Verified identity, but no account yet — collect business details before creating one.
            const pending = await getIronSession<PendingVendorSignupData>(await cookies(), pendingVendorSignupSessionOptions);
            pending.googleId = profile.sub;
            pending.email = email;
            pending.name = profile.name || email.split("@")[0];
            pending.picture = profile.picture || "";
            await pending.save();
            return NextResponse.redirect(new URL("/signup/vendor-details", req.url));
          }
          // No matching vendor account — send them to sign up with full business details instead.
          return failRedirect(req, "vendor", "google_no_vendor_account");
        }
        vendor.googleId = profile.sub;
        if (!vendor.isEmailVerified) vendor.isEmailVerified = true;
      }

      session.userId = vendor._id.toString();
      session.name = vendor.name;
      session.email = vendor.email;
      session.role = "vendor";
      session.isLoggedIn = true;
      await session.save();

      vendor.lastLoginAt = new Date();
      vendor.lastLoginDevice = describeDevice(userAgent);
      vendor.lastLoginMethod = "google";
      await vendor.save();

      await sendLoginNotificationEmail(vendor.email, vendor.name, "vendor", userAgent);

      return NextResponse.redirect(new URL("/vendor/dashboard", req.url));
    }

    // ─── User: find or create the account ───
    let user = await User.findOne({ googleId: profile.sub });

    if (!user) {
      user = await User.findOne({ email });
      if (user) {
        // Existing password-based account with the same email — link it.
        user.googleId = profile.sub;
        if (!user.isEmailVerified) user.isEmailVerified = true;
      } else {
        user = new User({
          googleId: profile.sub,
          name: profile.name || email.split("@")[0],
          email,
          isEmailVerified: true,
          profileImage: profile.picture || "",
        });
      }
    }

    // ─── Create the same encrypted session cookie the password flow uses ───
    session.userId = user._id.toString();
    session.name = user.name;
    session.email = user.email;
    session.role = "user";
    session.isLoggedIn = true;
    await session.save();

    user.lastLoginAt = new Date();
    user.lastLoginDevice = describeDevice(userAgent);
    user.lastLoginMethod = "google";
    await user.save();

    await sendLoginNotificationEmail(user.email, user.name, "user", userAgent);

    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch (error: unknown) {
    console.error("Google OAuth callback error:", error);
    return failRedirect(req, role);
  }
}
