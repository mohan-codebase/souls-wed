/**
 * LOGOUT API — POST /api/auth/logout
 * 
 * Destroys the encrypted session cookie, effectively logging the user out.
 * 
 * session.destroy() does two things:
 * 1. Clears all session data from memory
 * 2. Sets the cookie to expire immediately (maxAge: 0)
 * 
 * After this, any call to GET /api/auth/me will return authenticated: false
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";

export async function POST() {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    // destroy() clears the session and expires the cookie
    session.destroy();

    return NextResponse.json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error: unknown) {
    console.error("Error in /api/auth/logout:", error);
    return NextResponse.json(
      { message: "Internal server error occurred." },
      { status: 500 }
    );
  }
}

// Support GET requests as fallback for quick redirection or browser-driven logouts if needed
export async function GET(req: Request) {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );
    session.destroy();

    // Redirect to home page on GET logout
    return NextResponse.redirect(new URL("/", req.url));
  } catch (error: unknown) {
    console.error("Error in GET /api/auth/logout:", error);
    return NextResponse.redirect(new URL("/", req.url));
  }
}
