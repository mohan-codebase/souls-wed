import { connectDB } from "@/lib/mongodb";
import { hit, clientIp, LIMITS, tooManyRequests } from "@/lib/rate-limit";
import { Vendor } from "@/lib/models/Vendor";
import { Admin } from "@/lib/models/Admin";
import { User } from "@/lib/models/User";
import { Otp } from "@/lib/models/Otp";
import { sendVerificationOtpEmail } from "@/lib/mail";
import { hashPassword, validatePassword, validatePhone, validateEmail, validateName } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // Rate limited: this endpoint triggers outbound email, so without a cap it
    // is a free spam relay (and a way to mail-bomb an arbitrary address).
    const rl = hit(`signup:${clientIp(req)}`, LIMITS.SIGNUP.limit, LIMITS.SIGNUP.windowMs);
    if (!rl.ok) {
      return tooManyRequests("Too many sign-up attempts from this network. Please try again later.", rl.retryAfter);
    }

    await connectDB();
    const body = await req.json();
    const { role, name, email, password } = body;

    if (!role || !name || !email || !password) {
      return NextResponse.json(
        { message: "Required fields (role, name, email, password) are missing." },
        { status: 400 }
      );
    }

    const nameError = validateName(name);
    if (nameError) return NextResponse.json({ message: nameError }, { status: 400 });

    const emailError = validateEmail(email);
    if (emailError) return NextResponse.json({ message: emailError }, { status: 400 });

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json(
        { message: passwordError },
        { status: 400 }
      );
    }

    const passwordHash = hashPassword(password);

    if (role === "admin") {
      const { accessCode } = body;
      const systemAccessCode = process.env.ADMIN_ACCESS_CODE;
      if (!systemAccessCode) {
        return NextResponse.json(
          { message: "Admin registration is not available." },
          { status: 503 }
        );
      }

      if (!accessCode || accessCode !== systemAccessCode) {
        return NextResponse.json(
          { message: "Invalid or missing Admin Access Code." },
          { status: 403 }
        );
      }

      // Check if Admin exists
      const existingAdmin = await Admin.findOne({ email });
      if (existingAdmin) {
        return NextResponse.json(
          { message: "An administrator with this email already exists." },
          { status: 409 }
        );
      }

      // Generate and send OTP with pending registration data
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const registrationData = { name, email, passwordHash, role: "admin", isEmailVerified: false };
      await Otp.findOneAndUpdate(
        { email },
        { email, role: "admin", otp: otpCode, registrationData },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      await sendVerificationOtpEmail(email, name, otpCode);

      return NextResponse.json(
        { message: "Admin account registered successfully." },
        { status: 201 }
      );
    } else if (role === "user") {
      const { phone } = body;

      const phoneError = validatePhone(phone);
      if (phoneError) {
        return NextResponse.json(
          { message: phoneError },
          { status: 400 }
        );
      }

      // Check if User exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return NextResponse.json(
          { message: "A user with this email already exists." },
          { status: 409 }
        );
      }

      // Generate and send OTP with pending registration data
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const registrationData = { name, email, passwordHash, phone, role: "user", isEmailVerified: false };
      await Otp.findOneAndUpdate(
        { email },
        { email, role: "user", otp: otpCode, registrationData },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      await sendVerificationOtpEmail(email, name, otpCode);

      return NextResponse.json(
        { message: "User account registered successfully." },
        { status: 201 }
      );
    } else if (role === "vendor") {
      const { businessName, phone, category, city } = body;

      if (!businessName || !phone || !category || !city) {
        return NextResponse.json(
          { message: "Vendor specific fields (businessName, phone, category, city) are missing." },
          { status: 400 }
        );
      }

      const phoneError = validatePhone(phone);
      if (phoneError) {
        return NextResponse.json(
          { message: phoneError },
          { status: 400 }
        );
      }

      // Check if Vendor exists
      const existingVendor = await Vendor.findOne({ email });
      if (existingVendor) {
        return NextResponse.json(
          { message: "A vendor with this email already exists." },
          { status: 409 }
        );
      }

      // Generate and send OTP with pending registration data
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const registrationData = {
        name, // contact person
        businessName,
        email,
        passwordHash,
        phone,
        category,
        city,
        verified: false, // public signups start unverified
        isEmailVerified: false,
        available: true,
      };
      await Otp.findOneAndUpdate(
        { email },
        { email, role: "vendor", otp: otpCode, registrationData },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      await sendVerificationOtpEmail(email, name, otpCode);

      return NextResponse.json(
        { message: "Vendor account registered successfully." },
        { status: 201 }
      );
    } else {
      return NextResponse.json(
        { message: "Invalid user role specified." },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { message: "Internal server error occurred." },
      { status: 500 }
    );
  }
}
