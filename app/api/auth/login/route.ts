/**
 * LOGIN API ROUTE
 * 
 * WHAT HAPPENS WHEN A USER LOGS IN:
 * 
 * 1. Frontend sends: { email, password, role }
 * 2. We look up the user in the correct MongoDB collection based on role
 * 3. We verify the password against the stored hash
 * 4. If valid: create an ENCRYPTED session cookie using iron-session
 * 5. Return success + user info
 * 
 * BEFORE (insecure):
 *   cookieStore.set("session", JSON.stringify({ id, role }))
 *   ↑ Anyone could forge this!
 * 
 * AFTER (secure):
 *   Uses iron-session to encrypt the cookie with SESSION_SECRET
 *   ↑ Nobody can read or tamper with this
 */

import { connectDB } from "@/lib/mongodb";
import { Vendor } from "@/lib/models/Vendor";
import { Admin } from "@/lib/models/Admin";
import { User } from "@/lib/models/User";
import { Otp } from "@/lib/models/Otp";
import { verifyPassword } from "@/lib/auth";
import { sendLoginNotificationEmail, sendVerificationOtpEmail, dispatch } from "@/lib/mail";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import {
  SessionData,
  sessionOptions,
  PendingTwoFactorData,
  pendingTwoFactorSessionOptions,
} from "@/lib/session";
import { describeDevice } from "@/lib/device";
import { hit, reset, clientIp, LIMITS, tooManyRequests } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { email, password, role } = await req.json();

    if (!email || !password || !role) {
      return NextResponse.json(
        { message: "Email, password, and role are required." },
        { status: 400 }
      );
    }

    // ─── Step 0: Rate limit ───
    // Two independent buckets: per-account stops brute-forcing one password,
    // per-IP stops credential stuffing across many accounts. Checked before we
    // touch the database so a flood costs us nothing.
    const ip = clientIp(req);
    const accountKey = `login:acct:${role}:${String(email).toLowerCase().trim()}`;
    const ipKey = `login:ip:${ip}`;

    const perAccount = await hit(accountKey, LIMITS.LOGIN_PER_ACCOUNT.limit, LIMITS.LOGIN_PER_ACCOUNT.windowMs);
    if (!perAccount.ok) {
      return tooManyRequests(
        "Too many sign-in attempts for this account. Please try again in a few minutes.",
        perAccount.retryAfter
      );
    }

    const perIp = await hit(ipKey, LIMITS.LOGIN_PER_IP.limit, LIMITS.LOGIN_PER_IP.windowMs);
    if (!perIp.ok) {
      return tooManyRequests(
        "Too many sign-in attempts from this network. Please try again later.",
        perIp.retryAfter
      );
    }

    // ─── Step 1: Find the user in the correct collection ───
    // We have 3 separate MongoDB collections: Users, Vendors, Admins
    // The "role" field from the frontend tells us which one to search
    let user = null;

    if (role === "admin") {
      user = await Admin.findOne({ email: email.toLowerCase().trim() });
    } else if (role === "vendor") {
      user = await Vendor.findOne({ email: email.toLowerCase().trim() });
    } else if (role === "user") {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    } else {
      return NextResponse.json(
        { message: "Invalid user role specified." },
        { status: 400 }
      );
    }

    // ─── Step 2: Check if user exists and has a password ───
    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 }
      );
    }

    // ─── Step 3: Verify the password ───
    // verifyPassword() takes the plain text password and the stored hash,
    // re-hashes the plain text with the same salt, and compares
    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Password was correct — clear the per-account counter so earlier typos
    // don't count against them for the rest of the window. The per-IP bucket
    // deliberately stays, since stuffing attacks do land occasional hits.
    await reset(accountKey);

    // ─── Step 3.5: Check if email is verified ───
    // Exception: Allow admin@soulswed.com to bypass verification for easier testing/admin access
    if (!user.isEmailVerified && user.email !== "admin@soulswed.com") {
      return NextResponse.json(
        { message: "Please verify your email using the OTP sent to you before logging in.", unverified: true },
        { status: 403 }
      );
    }

    // ─── Step 3.8: Check Two-Factor Authentication ───
    if (user.twoFactorEnabled) {
      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Clear any existing OTPs for this login attempt
      await Otp.deleteMany({ email: user.email.toLowerCase().trim(), role });
      
      // Save new OTP
      await Otp.create({
        email: user.email.toLowerCase().trim(),
        role: role,
        otp: otpCode,
      });

      // Issue proof that the password step was cleared. verify-2fa reads the
      // identity from this sealed cookie rather than trusting a posted email —
      // otherwise a correct OTP alone is enough to log in as someone.
      const pending = await getIronSession<PendingTwoFactorData>(
        await cookies(),
        pendingTwoFactorSessionOptions
      );
      pending.userId = user._id.toString();
      pending.email = user.email;
      pending.role = role;
      pending.expiresAt = Date.now() + 10 * 60 * 1000;
      await pending.save();

      // Send OTP via email. Deliberately awaited, unlike the login notification:
      // if this fails the user is stranded at a code prompt with no code, so a
      // slow response beats a silent dead end.
      await sendVerificationOtpEmail(user.email, user.name, otpCode);

      // Log for local dev
      console.log(`[2FA DEBUG] Login OTP for ${user.email}: ${otpCode}`);

      return NextResponse.json({
        success: true,
        requires2FA: true,
        message: "Two-Factor Authentication required.",
        user: { email: user.email, role: role }
      });
    }

    // ─── Step 4: Create encrypted session cookie ───
    // This is the key change from the old approach.
    // getIronSession() reads/creates the encrypted cookie.
    // We set properties on it, then call .save() to write the cookie.
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    session.userId = user._id.toString();
    session.name = user.name;
    session.email = user.email;
    session.role = role;
    session.isLoggedIn = true;

    await session.save();
    // ↑ This encrypts all the session data and sets it as a cookie
    // The cookie value looks like: "Fe26.2**abc123..." (encrypted gibberish)
    // Nobody can read or modify it without SESSION_SECRET

    const userAgent = req.headers.get("user-agent") || "Unknown Device";

    // Record last login time + device identity for the admin panel's active-sessions view.
    if (role === "vendor" || role === "user") {
      user.lastLoginAt = new Date();
      user.lastLoginDevice = describeDevice(userAgent);
      user.lastLoginMethod = "password";
      await user.save();
    }

    // Fire-and-forget. This used to be awaited despite the comment calling it
    // asynchronous, which held the login response open for the whole SMTP
    // round-trip — measured at 10-15s per sign-in, and a hard failure whenever
    // the mail server was down. See AUDIT-REPORT.md #7.
    dispatch(
      sendLoginNotificationEmail(user.email, user.name, role, userAgent),
      "login-notification"
    );

    return NextResponse.json({
      success: true,
      message: "Login successful.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: role,
      },
    });
  } catch (error: unknown) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { message: "Internal server error occurred." },
      { status: 500 }
    );
  }
}
