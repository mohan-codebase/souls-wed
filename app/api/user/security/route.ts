import { connectDB } from "@/lib/mongodb";
import { getAccountForSession } from "@/lib/accounts";
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

    // Works for all three roles. Previously User-only, which is part of why
    // admins had no 2FA switch anywhere in their settings.
    const resolved = await getAccountForSession(session);
    if (!resolved) {
      return NextResponse.json({ success: false, message: "Account not found" }, { status: 404 });
    }
    const { account: dbUser, role } = resolved;

    return NextResponse.json({
      success: true,
      role,
      security: {
        // Users default to 2FA on; vendors and admins are opt-in so an existing
        // account isn't locked out by a deploy that adds the field.
        twoFactorEnabled: dbUser.twoFactorEnabled ?? role === "user",
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

    const resolved = await getAccountForSession(session);
    if (!resolved) {
      return NextResponse.json({ success: false, message: "Account not found" }, { status: 404 });
    }
    const updatedUser = resolved.account;

    if (twoFactorEnabled !== undefined) updatedUser.twoFactorEnabled = Boolean(twoFactorEnabled);
    if (loginAlertsEnabled !== undefined) updatedUser.loginAlertsEnabled = Boolean(loginAlertsEnabled);
    if (sessionTimeoutDays !== undefined) {
      updatedUser.sessionTimeoutDays = Number(sessionTimeoutDays);
    }
    await updatedUser.save();

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
