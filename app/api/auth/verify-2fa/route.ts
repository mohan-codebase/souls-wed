import { connectDB } from "@/lib/mongodb";
import { Vendor } from "@/lib/models/Vendor";
import { Admin } from "@/lib/models/Admin";
import { User } from "@/lib/models/User";
import { Otp } from "@/lib/models/Otp";
import { sendLoginNotificationEmail, dispatch } from "@/lib/mail";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import {
  SessionData,
  sessionOptions,
  PendingTwoFactorData,
  pendingTwoFactorSessionOptions,
} from "@/lib/session";
import { hit, reset, LIMITS, tooManyRequests } from "@/lib/rate-limit";
import { timingSafeEqualStr } from "@/lib/auth";
import { describeDevice } from "@/lib/device";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { otp } = await req.json();

    if (!otp) {
      return NextResponse.json({ message: "A verification code is required." }, { status: 400 });
    }

    // ─── Who is this? ───
    // Read the identity from the sealed cookie login issued, NOT from the
    // request body. Previously this endpoint took `{ email, role, otp }` from
    // an anonymous caller and minted a session on any OTP match — so a correct
    // code alone logged you in, with no proof the password step ever happened.
    const pending = await getIronSession<PendingTwoFactorData>(
      await cookies(),
      pendingTwoFactorSessionOptions
    );

    if (!pending.userId || !pending.email || !pending.expiresAt || pending.expiresAt < Date.now()) {
      return NextResponse.json(
        { message: "Your sign-in session expired. Please enter your password again." },
        { status: 440 }
      );
    }

    const email = pending.email;
    const role = pending.role;

    // ─── Rate limit the guesses ───
    // A 6-digit code is only 1,000,000 possibilities; with unlimited attempts
    // and a 15-minute window it was gridable. Keyed on the account, so an
    // attacker can't sidestep it by rotating IPs.
    const otpKey = `2fa:${role}:${email.toLowerCase().trim()}`;
    const limited = await hit(otpKey, LIMITS.OTP_VERIFY.limit, LIMITS.OTP_VERIFY.windowMs);
    if (!limited.ok) {
      // Burn the code entirely — an attacker who has exhausted their guesses
      // should not get another shot when the window rolls over.
      await Otp.deleteMany({ email: email.toLowerCase().trim(), role });
      return tooManyRequests(
        "Too many incorrect codes. Please sign in again to request a new one.",
        limited.retryAfter
      );
    }

    // Look the record up by identity, then compare the code in constant time —
    // matching on `otp` inside the query would leak timing through the index.
    const otpRecord = await Otp.findOne({ email: email.toLowerCase().trim(), role });

    if (!otpRecord || !timingSafeEqualStr(String(otp), String(otpRecord.otp))) {
      return NextResponse.json(
        {
          message: "Invalid or expired code.",
          attemptsRemaining: limited.remaining,
        },
        { status: 400 }
      );
    }

    // Find User
    let user = null;
    if (role === "admin") {
      user = await Admin.findOne({ email: email.toLowerCase().trim() });
    } else if (role === "vendor") {
      user = await Vendor.findOne({ email: email.toLowerCase().trim() });
    } else if (role === "user") {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    }

    if (!user) {
       return NextResponse.json(
        { message: "User not found." },
        { status: 404 }
      );
    }

    // Delete the used OTP, clear the guess counter, and burn the pending-2FA
    // cookie so it can't be replayed.
    await Otp.deleteOne({ _id: otpRecord._id });
    await reset(otpKey);
    pending.destroy();

    // Create encrypted session cookie
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

    const userAgent = req.headers.get("user-agent") || "Unknown Device";

    // Record last login
    if (role === "vendor" || role === "user") {
      user.lastLoginAt = new Date();
      user.lastLoginDevice = describeDevice(userAgent);
      user.lastLoginMethod = "password+2fa";
      await user.save();
    }

    // Fire-and-forget — see the note in app/api/auth/login/route.ts.
    dispatch(
      sendLoginNotificationEmail(user.email, user.name, role, userAgent),
      "login-notification (2fa)"
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
    console.error("Verify 2FA API error:", error);
    return NextResponse.json(
      { message: "Internal server error occurred." },
      { status: 500 }
    );
  }
}
