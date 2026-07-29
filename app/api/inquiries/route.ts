import { connectDB } from "@/lib/mongodb";
import { hit, clientIp, LIMITS, tooManyRequests } from "@/lib/rate-limit";
import { Inquiry } from "@/lib/models/Inquiry";
import { sendInquiryNotificationEmail } from "@/lib/mail";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // Rate limited: this endpoint triggers outbound email, so without a cap it
    // is a free spam relay (and a way to mail-bomb an arbitrary address).
    const rl = await hit(`inquiry:${clientIp(req)}`, LIMITS.PUBLIC_FORM.limit, LIMITS.PUBLIC_FORM.windowMs);
    if (!rl.ok) {
      return tooManyRequests("Too many enquiries from this network. Please try again later.", rl.retryAfter);
    }

    await connectDB();
    const body = await req.json();
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const email = String(body.email || "").trim();
    const message = String(body.message || "").trim();

    if (!firstName || !lastName || !email || !message) {
      return NextResponse.json({ message: "All fields are required." }, { status: 400 });
    }

    const inquiry = new Inquiry({ firstName, lastName, email, message });
    await inquiry.save();

    await sendInquiryNotificationEmail({ firstName, lastName, email, message });

    return NextResponse.json({ message: "Thank you — we'll be in touch shortly." }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating inquiry:", error);
    return NextResponse.json({ message: "Internal server error occurred." }, { status: 500 });
  }
}
