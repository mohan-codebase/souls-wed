import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { Vendor } from "@/lib/models/Vendor";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";

async function checkAdminSession() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );
  if (!session.isLoggedIn || session.role !== "admin") {
    return false;
  }
  return true;
}

// Anyone who logged in within this window is considered "online" for display purposes.
const ONLINE_WINDOW_MS = 15 * 60 * 1000;

export async function GET() {
  try {
    if (!(await checkAdminSession())) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    await connectDB();

    const [users, vendors] = await Promise.all([
      User.find({ lastLoginAt: { $ne: null } }, "name email role lastLoginAt lastLoginDevice lastLoginMethod")
        .sort({ lastLoginAt: -1 })
        .lean(),
      Vendor.find({ lastLoginAt: { $ne: null } }, "name businessName email city lastLoginAt lastLoginDevice lastLoginMethod")
        .sort({ lastLoginAt: -1 })
        .lean(),
    ]);

    const now = Date.now();
    const withStatus = <T extends { lastLoginAt?: Date }>(list: T[]) =>
      list.map((item) => ({
        ...item,
        isOnline: item.lastLoginAt
          ? now - new Date(item.lastLoginAt).getTime() < ONLINE_WINDOW_MS
          : false,
      }));

    return NextResponse.json({
      success: true,
      users: withStatus(users),
      vendors: withStatus(vendors),
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/admin/sessions:", error);
    return NextResponse.json({ message: "Failed to fetch sessions." }, { status: 500 });
  }
}
