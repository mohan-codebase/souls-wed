import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { Otp } from "@/lib/models/Otp";
import { sendVerificationOtpEmail } from "@/lib/mail";
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

    await connectDB();
    const dbUser = await User.findById(session.userId);
    if (!dbUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Clear existing OTPs
    await Otp.deleteMany({ email: dbUser.email.toLowerCase().trim(), role: "user" });
    
    // Save new OTP
    await Otp.create({
      email: dbUser.email.toLowerCase().trim(),
      role: "user",
      otp: otpCode,
    });

    // Send OTP Email
    await sendVerificationOtpEmail(dbUser.email, dbUser.name, otpCode);
    
    // Log for local dev testing
    console.log(`[2FA DEBUG] Setup OTP for ${dbUser.email}: ${otpCode}`);

    return NextResponse.json({
      success: true,
      message: "OTP generated successfully",
    });
  } catch (error) {
    console.error("POST /api/user/2fa/generate error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
