/**
 * AVATAR UPDATE API — POST /api/auth/settings/avatar
 *
 * Allows any authenticated user (user, vendor, admin) to update
 * their profile avatar. Accepts either:
 *   - FormData with an image file
 *   - JSON with { profileImage: "" } to clear the avatar
 */

import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "@/lib/session";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { Vendor } from "@/lib/models/Vendor";
import { Admin } from "@/lib/models/Admin";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: Request) {
  try {
    // ─── Authenticate ───
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    if (!session.isLoggedIn || !session.userId || !session.role) {
      return NextResponse.json({ message: "Login required." }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";
    let profileImage = "";

    // ─── Handle JSON body (clear avatar) ───
    if (contentType.includes("application/json")) {
      const body = await req.json();

      if (body.profileImage !== undefined) {
        profileImage = typeof body.profileImage === "string" ? body.profileImage.trim().slice(0, 500) : "";
      } else {
        return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
      }
    }
    // ─── Handle FormData (image upload) ───
    else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ message: "No file uploaded." }, { status: 400 });
      }

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
          { message: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed." },
          { status: 400 }
        );
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { message: "File too large. Maximum allowed size is 5 MB." },
          { status: 400 }
        );
      }

      // Save file
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Since Vercel is a serverless environment, writing to /public is not allowed at runtime.
      // We convert the file to a base64 Data URI and save it directly to the database.
      const mimeType = file.type;
      const base64 = buffer.toString("base64");
      profileImage = `data:${mimeType};base64,${base64}`;
    } else {
      return NextResponse.json({ message: "Unsupported content type." }, { status: 400 });
    }

    // ─── Update database ───
    await connectDB();

    const { userId, role } = session;
    let Model;

    if (role === "admin") {
      Model = Admin;
    } else if (role === "vendor") {
      Model = Vendor;
    } else {
      Model = User;
    }

    const updated = await Model.findByIdAndUpdate(
      userId,
      { $set: { profileImage } },
      { new: true }
    ).select("profileImage");

    if (!updated) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      profileImage: updated.profileImage,
      message: profileImage ? "Avatar updated successfully." : "Avatar removed.",
    });
  } catch (error: unknown) {
    console.error("Error in /api/auth/settings/avatar:", error);
    const message = error instanceof Error ? error.message : "Failed to update avatar.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
