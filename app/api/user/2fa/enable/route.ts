import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { Otp } from "@/lib/models/Otp";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { otp } = await req.json();

    if (!otp) {
      return NextResponse.json({ success: false, message: "OTP is required" }, { status: 400 });
    }

    await connectDB();
    const dbUser = await User.findById(session.userId);
    if (!dbUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // Verify OTP
    const otpRecord = await Otp.findOne({ 
      email: dbUser.email.toLowerCase().trim(), 
      role: "user",
      otp: otp 
    });

    if (!otpRecord) {
      return NextResponse.json({ success: false, message: "Invalid or expired OTP" }, { status: 400 });
    }

    // OTP is valid. Delete it and enable 2FA
    await Otp.deleteOne({ _id: otpRecord._id });
    
    dbUser.twoFactorEnabled = true;
    await dbUser.save();

    return NextResponse.json({
      success: true,
      message: "Two-Factor Authentication successfully enabled.",
      security: {
        twoFactorEnabled: dbUser.twoFactorEnabled,
        loginAlertsEnabled: dbUser.loginAlertsEnabled,
        sessionTimeoutDays: dbUser.sessionTimeoutDays,
      }
    });

  } catch (error) {
    console.error("POST /api/user/2fa/enable error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
