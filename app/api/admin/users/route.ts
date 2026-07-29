import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
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

export async function GET() {
  try {
    if (!(await checkAdminSession())) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    await connectDB();
    const users = await User.find({
      role: { $nin: ["admin", "superadmin"] },
      email: { $ne: "admin@soulswed.com" },
      name: { $ne: "Admin User" },
    }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, users });
  } catch (error: unknown) {
    console.error("Error in GET /api/admin/users:", error);
    return NextResponse.json({ message: "Failed to fetch users." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    if (!(await checkAdminSession())) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json({ message: "User ID and role are required." }, { status: 400 });
    }

    const validRoles = ["user", "couple"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { message: "Invalid role. Valid roles for users are: user, couple." },
        { status: 400 }
      );
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { role } },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `User role updated to ${role} successfully.`,
      user: updatedUser,
    });
  } catch (error: unknown) {
    console.error("Error in PATCH /api/admin/users:", error);
    return NextResponse.json({ message: "Failed to update user." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!(await checkAdminSession())) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ message: "User ID is required." }, { status: 400 });
    }

    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "User deleted successfully.",
    });
  } catch (error: unknown) {
    console.error("Error in DELETE /api/admin/users:", error);
    return NextResponse.json({ message: "Failed to delete user." }, { status: 500 });
  }
}
