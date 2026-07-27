import { connectDB } from "@/lib/mongodb";
import { Vendor } from "@/lib/models/Vendor";
import { validatePhone } from "@/lib/auth";
import { sendLoginNotificationEmail } from "@/lib/mail";
import { describeDevice } from "@/lib/device";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions, PendingVendorSignupData, pendingVendorSignupSessionOptions } from "@/lib/session";

// Step 2 of Google vendor signup: the identity was already verified by
// /api/auth/google/callback and stashed in the pending-signup cookie; this
// route just needs the business details Google couldn't supply.
export async function POST(req: Request) {
  try {
    const { businessName, phone, category, city } = await req.json();

    if (!businessName || !phone || !category || !city) {
      return NextResponse.json(
        { message: "Business name, phone, category, and city are required." },
        { status: 400 }
      );
    }

    const phoneError = validatePhone(phone);
    if (phoneError) {
      return NextResponse.json({ message: phoneError }, { status: 400 });
    }

    const cookieStore = await cookies();
    const pending = await getIronSession<PendingVendorSignupData>(cookieStore, pendingVendorSignupSessionOptions);

    if (!pending.googleId || !pending.email) {
      return NextResponse.json(
        { message: "Your Google sign-in expired. Please start again." },
        { status: 401 }
      );
    }

    await connectDB();

    const existingVendor = await Vendor.findOne({
      $or: [{ email: pending.email }, { googleId: pending.googleId }],
    });
    if (existingVendor) {
      return NextResponse.json(
        { message: "A vendor account already exists for this Google account. Please sign in instead." },
        { status: 409 }
      );
    }

    const vendor = new Vendor({
      googleId: pending.googleId,
      name: pending.name,
      businessName,
      email: pending.email,
      phone,
      category,
      categories: [category],
      city,
      profileImage: pending.picture || "",
      isEmailVerified: true, // Google already verified this address
      verified: false,       // still needs admin approval like any public signup
      available: true,
    });

    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    session.userId = vendor._id.toString();
    session.name = vendor.name;
    session.email = vendor.email;
    session.role = "vendor";
    session.isLoggedIn = true;
    await session.save();

    const userAgent = req.headers.get("user-agent") || "Unknown Device";
    vendor.lastLoginAt = new Date();
    vendor.lastLoginDevice = describeDevice(userAgent);
    vendor.lastLoginMethod = "google";
    await vendor.save();

    pending.destroy();

    await sendLoginNotificationEmail(vendor.email, vendor.name, "vendor", userAgent);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Complete vendor Google signup error:", error);
    return NextResponse.json({ message: "Internal server error occurred." }, { status: 500 });
  }
}
