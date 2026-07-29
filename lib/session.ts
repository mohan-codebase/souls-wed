/**
 * SESSION CONFIGURATION
 * 
 * This file configures "iron-session" — a library that ENCRYPTS and SIGNS
 * cookies so nobody can tamper with them.
 * 
 * HOW IT WORKS:
 * 1. When a user logs in, we store their session data (id, role, etc.)
 * 2. iron-session encrypts this data using SESSION_SECRET from .env
 * 3. The encrypted string is stored as a cookie
 * 4. When a request comes in, iron-session decrypts the cookie
 * 5. If someone tampered with it, decryption fails → session rejected
 * 
 * WHY NOT JWT?
 * JWTs are signed but NOT encrypted — anyone can READ the payload
 * (they just can't modify it). iron-session encrypts everything,
 * so nobody can even see what's inside the cookie.
 */

import { SessionOptions } from "iron-session";

/**
 * This interface defines WHAT we store in the session.
 * TypeScript uses this to give us autocomplete and type checking.
 */
export interface SessionData {
  userId: string;
  name: string;
  email: string;
  role: "user" | "vendor" | "admin";
  isLoggedIn: boolean;
}



/**
 * Session configuration options.
 * 
 * password: The secret key used to encrypt/decrypt the cookie.
 *           MUST be at least 32 characters long.
 *           We read it from .env so it's never in source code.
 * 
 * cookieName: The name of the cookie stored in the browser.
 * 
 * cookieOptions:
 *   - httpOnly: Browser JavaScript can't read this cookie (prevents XSS theft)
 *   - secure: Only sent over HTTPS in production (prevents network sniffing)
 *   - sameSite: "lax" means the cookie is sent on navigation but not on
 *               cross-site POST requests (basic CSRF protection)
 *   - maxAge: Cookie expires after 7 days (in seconds: 7 × 24 × 60 × 60)
 */
export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "soulswed-session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

/**
 * Holds the verified Google identity of a brand-new vendor between the
 * OAuth callback and the "complete your business details" step — Vendor
 * accounts need businessName/phone/category/city that Google can't supply,
 * so we can't create the account in one shot like we do for Users.
 */
export interface PendingVendorSignupData {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

export const pendingVendorSignupSessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "soulswed-pending-vendor-signup",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 10, // 10 minutes — just long enough to fill in the form
  },
};

/**
 * Proof that the caller has already cleared step one of a two-factor login
 * (i.e. supplied the correct password) and is now owed the chance to submit an
 * OTP.
 *
 * WHY THIS EXISTS
 *
 * `POST /api/auth/verify-2fa` used to accept `{ email, role, otp }` from an
 * anonymous caller and mint a full session on an OTP match. It never re-checked
 * the password, so possession of a correct 6-digit code was, by itself, enough
 * to log in as that account. Combined with the absence of any attempt limit,
 * an attacker could grind the code space during a victim's real login window
 * and take over the account without ever knowing the password.
 *
 * Login now issues this sealed, 10-minute cookie, and verify-2fa reads the
 * identity from it instead of trusting the posted email. See AUDIT-REPORT.md #6.
 */
export interface PendingTwoFactorData {
  userId: string;
  email: string;
  role: "user" | "vendor" | "admin";
  /** Unix ms. Belt and braces alongside the cookie's own maxAge. */
  expiresAt: number;
}

export const pendingTwoFactorSessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "soulswed-pending-2fa",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 10, // 10 minutes — the OTP itself lives 15
  },
};
