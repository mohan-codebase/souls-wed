import { connectDB } from "@/lib/mongodb";
import { getAccountForSession } from "@/lib/accounts";
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

    // Resolve whichever collection this session belongs to. This route used to
    // look only in `User`, so an admin or vendor calling it got a 404 and had
    // no way to turn 2FA on at all.
    const resolved = await getAccountForSession(session);
    if (!resolved) {
      return NextResponse.json({ success: false, message: "Account not found" }, { status: 404 });
    }
    const { account: dbUser, role } = resolved;

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Clear existing OTPs
    await Otp.deleteMany({ email: dbUser.email.toLowerCase().trim(), role });
    
    // Save new OTP
    await Otp.create({
      email: dbUser.email.toLowerCase().trim(),
      role,
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
