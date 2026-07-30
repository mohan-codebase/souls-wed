import { connectDB } from "@/lib/mongodb";
import { Vendor } from "@/lib/models/Vendor";
import { Admin } from "@/lib/models/Admin";
import { User } from "@/lib/models/User";
import { Otp } from "@/lib/models/Otp";
import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "@/lib/session";
import { hit, LIMITS, tooManyRequests } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { email, role, otp } = await req.json();

    if (!email || !role || !otp) {
      return NextResponse.json(
        { message: "Email, role, and OTP are required." },
        { status: 400 }
      );
    }

    // Cap OTP guesses. A 6-digit code is only 1,000,000 possibilities; with no
    // limit and a 15-minute TTL it was gridable, so an attacker could brute-force
    // email verification. Keyed per account+role so rotating IPs doesn't help.
    const cleanEmail = email.toLowerCase().trim();
    const otpKey = `verify-otp:${role}:${cleanEmail}`;
    const limited = await hit(otpKey, LIMITS.OTP_VERIFY.limit, LIMITS.OTP_VERIFY.windowMs);
    if (!limited.ok) {
      // Burn the pending code so exhausting the guesses ends the attempt rather
      // than handing over a fresh window.
      await Otp.deleteMany({ email: cleanEmail, role });
      return tooManyRequests(
        "Too many incorrect codes. Please sign up again to request a new one.",
        limited.retryAfter
      );
    }

    // Check OTP
    const otpRecord = await Otp.findOne({ email: cleanEmail, role, otp });
    
    if (!otpRecord) {
      return NextResponse.json(
        { message: "Invalid or expired OTP." },
        { status: 400 }
      );
    }

    // Extract registration data and create the actual user
    const registrationData = otpRecord.registrationData;
    if (!registrationData) {
      return NextResponse.json(
        { message: "Registration data not found in OTP record. Please sign up again." },
        { status: 400 }
      );
    }

    registrationData.isEmailVerified = true;

    let user = null;
    if (role === "admin") {
      user = new Admin(registrationData);
      await user.save();
    } else if (role === "vendor") {
      user = new Vendor(registrationData);
      await user.save();
    } else if (role === "user") {
      user = new User(registrationData);
      await user.save();
    } else {
      return NextResponse.json(
        { message: "Invalid user role specified." },
        { status: 400 }
      );
    }

    // Delete the used OTP
    await Otp.deleteOne({ _id: otpRecord._id });

    // Auto-login: Create encrypted session cookie
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

    return NextResponse.json({
      success: true,
      message: "Email verified successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: role,
      },
    });
  } catch (error: unknown) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { message: "Internal server error occurred." },
      { status: 500 }
    );
  }
}
