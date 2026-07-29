import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";

export async function GET() {
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

    return NextResponse.json({
      success: true,
      security: {
        twoFactorEnabled: dbUser.twoFactorEnabled ?? true,
        loginAlertsEnabled: dbUser.loginAlertsEnabled ?? true,
        sessionTimeoutDays: dbUser.sessionTimeoutDays ?? 15,
      },
    });
  } catch (error) {
    console.error("GET /api/user/security error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { twoFactorEnabled, loginAlertsEnabled, sessionTimeoutDays } = await req.json();

    await connectDB();
    const updatedUser = await User.findByIdAndUpdate(
      session.userId,
      {
        ...(twoFactorEnabled !== undefined && { twoFactorEnabled }),
        ...(loginAlertsEnabled !== undefined && { loginAlertsEnabled }),
        ...(sessionTimeoutDays !== undefined && { sessionTimeoutDays: Number(sessionTimeoutDays) }),
      },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Security preferences updated successfully",
      security: {
        twoFactorEnabled: updatedUser.twoFactorEnabled,
        loginAlertsEnabled: updatedUser.loginAlertsEnabled,
        sessionTimeoutDays: updatedUser.sessionTimeoutDays,
      },
    });
  } catch (error) {
    console.error("POST /api/user/security error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
