import { connectDB } from "@/lib/mongodb";
import { Admin } from "@/lib/models/Admin";
import { verifyPassword, hashPassword, validatePassword } from "@/lib/auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    await connectDB();
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { message: "Both current password and new password are required." },
        { status: 400 }
      );
    }

    // Signup enforces validatePassword() — 8+ chars with mixed case, a digit and
    // a symbol — but this route only checked length >= 6, so a user (or an
    // admin) could immediately downgrade to a weak password. See AUDIT-REPORT #15.
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return NextResponse.json({ message: passwordError }, { status: 400 });
    }

    const admin = await Admin.findById(session.userId);
    if (!admin) {
      return NextResponse.json({ message: "Admin account not found." }, { status: 404 });
    }

    // Verify current password
    const isValid = verifyPassword(currentPassword, admin.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { message: "Incorrect current password." },
        { status: 401 }
      );
    }

    // Update to new password
    admin.passwordHash = hashPassword(newPassword);
    await admin.save();

    return NextResponse.json({ success: true, message: "Password updated successfully." });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ message: "Failed to update password.", error: msg }, { status: 500 });
  }
}
