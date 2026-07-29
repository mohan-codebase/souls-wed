import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "@/lib/session";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { Vendor } from "@/lib/models/Vendor";
import { Admin } from "@/lib/models/Admin";

export async function POST(req: Request) {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ message: "Login required." }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, gender, weddingDate, nationality, maritalStatus, city, state } = body;

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

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (gender !== undefined) updateData.gender = gender;
    if (weddingDate !== undefined) updateData.weddingDate = weddingDate;
    if (nationality !== undefined) updateData.nationality = nationality;
    if (maritalStatus !== undefined) updateData.maritalStatus = maritalStatus;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;

    const updatedUser = await Model.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        profileImage: updatedUser.profileImage,
        role: updatedUser.role || role,
        gender: updatedUser.gender,
        maritalStatus: updatedUser.maritalStatus,
        city: updatedUser.city,
        state: updatedUser.state,
      },
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/user/profile:", error);
    const message = error instanceof Error ? error.message : "Failed to update profile.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
