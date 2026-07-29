import { connectDB } from "@/lib/mongodb";
import { Vendor } from "@/lib/models/Vendor";
import { Admin } from "@/lib/models/Admin";
import { User } from "@/lib/models/User";
import { Otp } from "@/lib/models/Otp";
import { sendLoginNotificationEmail, dispatch } from "@/lib/mail";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { describeDevice } from "@/lib/device";

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

    // Check OTP
    const otpRecord = await Otp.findOne({ email: email.toLowerCase().trim(), role, otp });
    
    if (!otpRecord) {
      return NextResponse.json(
        { message: "Invalid or expired OTP." },
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

    // Delete the used OTP
    await Otp.deleteOne({ _id: otpRecord._id });

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
