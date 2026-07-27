/**
 * SESSION CHECK API — GET /api/auth/me
 * 
 * This route answers the question: "Is the current user logged in, and who are they?"
 * 
 * EVERY page that needs auth (dashboard, vendor panel, admin console, booking)
 * calls this endpoint to check if the user has a valid session.
 * 
 * HOW IT WORKS:
 * 1. Read the encrypted session cookie using iron-session
 * 2. If session.isLoggedIn is false → return { authenticated: false }
 * 3. If logged in → look up the user in MongoDB to confirm they still exist
 * 4. Return full user profile data
 * 
 * WHY CHECK THE DATABASE?
 * The session cookie says "user abc123 is logged in" — but what if that user
 * was deleted from the database? We verify against the DB to be safe.
 */

import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { Vendor } from "@/lib/models/Vendor";
import { Admin } from "@/lib/models/Admin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";

export async function GET() {
  try {
    // ─── Step 1: Read the encrypted session ───
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    // ─── Step 2: Check if logged in ───
    if (!session.isLoggedIn) {
      return NextResponse.json(
        { authenticated: false, message: "No active session found." },
        { status: 200 }
      );
    }

    const { userId, role } = session;
    if (!userId || !role) {
      return NextResponse.json(
        { authenticated: false, message: "Malformed session data." },
        { status: 200 }
      );
    }

    // ─── Step 3: Verify user still exists in database ───
    await connectDB();
    let dbUser = null;

    if (role === "admin") {
      dbUser = await Admin.findById(userId).select("-passwordHash");
    } else if (role === "vendor") {
      dbUser = await Vendor.findById(userId).select("-passwordHash");
    } else if (role === "user") {
      dbUser = await User.findById(userId).select("-passwordHash");
    } else {
      return NextResponse.json(
        { authenticated: false, message: "Unknown role in session." },
        { status: 200 }
      );
    }

    if (!dbUser) {
      // User was deleted from DB but cookie still exists — clear it
      await session.destroy();
      return NextResponse.json(
        { authenticated: false, message: "User not found in database." },
        { status: 200 }
      );
    }

    // ─── Step 4: Return user profile ───
    return NextResponse.json({
      authenticated: true,
      user: {
        id: dbUser._id,
        name: dbUser.name,
        email: dbUser.email,
        role: role,
        phone: dbUser.phone || "",
        businessName: dbUser.businessName || "",
        category: dbUser.category || "",
        city: dbUser.city || "",
        description: dbUser.description || "",
        website: dbUser.website || "",
        instagram: dbUser.instagram || "",
        priceFrom: dbUser.priceFrom || "",
        images: dbUser.images || [],
        verified: dbUser.verified || false,
        featured: dbUser.featured || false,
        available: dbUser.available !== false,
        profileImage: dbUser.profileImage || "",
      },
    });
  } catch (error: unknown) {
    console.error("Error in /api/auth/me:", error);
    return NextResponse.json(
      { message: "Internal server error occurred." },
      { status: 500 }
    );
  }
}
