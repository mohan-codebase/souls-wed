import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { Vendor } from "@/lib/models/Vendor";
import { Admin } from "@/lib/models/Admin";
import { hashPassword, validatePassword } from "@/lib/auth";
import { hit, clientIp, LIMITS, tooManyRequests } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Cap reset submissions per IP. The token is unguessable, so this is
    // abuse-limiting, not anti-brute-force — but an unthrottled write endpoint
    // shouldn't be left open.
    const rl = await hit(
      `reset-password:${clientIp(req)}`,
      LIMITS.RESET_PASSWORD.limit,
      LIMITS.RESET_PASSWORD.windowMs
    );
    if (!rl.ok) {
      return tooManyRequests(
        "Too many password reset attempts. Please try again in a few minutes.",
        rl.retryAfter
      );
    }

    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ message: "Token and password are required" }, { status: 400 });
    }

    // Validate password complexity
    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ message: passwordError }, { status: 400 });
    }

    await connectDB();

    // Hash the incoming token to match what's stored in the database
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Search for account with this token that hasn't expired
    let account = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!account) {
      account = await Vendor.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() },
      });
    }

    if (!account) {
      account = await Admin.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() },
      });
    }

    if (!account) {
      return NextResponse.json({ message: "Password reset token is invalid or has expired." }, { status: 400 });
    }

    // Hash the new password
    account.passwordHash = hashPassword(password);
    
    // Clear the reset token fields
    account.resetPasswordToken = undefined;
    account.resetPasswordExpires = undefined;
    
    await account.save();

    return NextResponse.json({ message: "Password has been reset successfully." }, { status: 200 });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
