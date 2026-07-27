import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { PendingVendorSignupData, pendingVendorSignupSessionOptions } from "@/lib/session";

// Lets the vendor-details page show which Google account is being completed,
// without exposing the raw googleId to the client.
export async function GET() {
  const pending = await getIronSession<PendingVendorSignupData>(await cookies(), pendingVendorSignupSessionOptions);

  if (!pending.googleId || !pending.email) {
    return NextResponse.json({ message: "No pending Google sign-up found." }, { status: 404 });
  }

  return NextResponse.json({
    email: pending.email,
    name: pending.name,
    picture: pending.picture || "",
  });
}
