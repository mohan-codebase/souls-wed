import { connectDB } from "@/lib/mongodb";
import { Inquiry } from "@/lib/models/Inquiry";
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

export async function GET(req: Request) {
  try {
    if (!(await checkAdminSession())) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const query: Record<string, any> = {};

    if (status && status !== "all") {
      query.status = status;
    }

    const inquiries = await Inquiry.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, inquiries });
  } catch (error: unknown) {
    console.error("Error in GET /api/admin/inquiries:", error);
    return NextResponse.json({ message: "Failed to fetch inquiries." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    if (!(await checkAdminSession())) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();
    const { inquiryId, status } = body;

    if (!inquiryId || !status) {
      return NextResponse.json({ message: "Inquiry ID and status are required." }, { status: 400 });
    }

    const updatedInquiry = await Inquiry.findByIdAndUpdate(
      inquiryId,
      { $set: { status } },
      { new: true }
    );

    if (!updatedInquiry) {
      return NextResponse.json({ message: "Inquiry not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, inquiry: updatedInquiry });
  } catch (error: unknown) {
    console.error("Error in PATCH /api/admin/inquiries:", error);
    return NextResponse.json({ message: "Failed to update inquiry." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!(await checkAdminSession())) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const inquiryId = searchParams.get("inquiryId");

    if (!inquiryId) {
      return NextResponse.json({ message: "Inquiry ID is required." }, { status: 400 });
    }

    await Inquiry.findByIdAndDelete(inquiryId);
    return NextResponse.json({ success: true, message: "Inquiry deleted successfully." });
  } catch (error: unknown) {
    console.error("Error in DELETE /api/admin/inquiries:", error);
    return NextResponse.json({ message: "Failed to delete inquiry." }, { status: 500 });
  }
}
