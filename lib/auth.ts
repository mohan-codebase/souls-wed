import crypto from "crypto";

/**
 * Hash a password using PBKDF2 with a random salt.
 * Returns the hash in the format: salt:hash
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100_000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify a plain text password against a stored pbkdf2 hash.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(":")) {
    return false;
  }
  const [salt, originalHash] = storedHash.split(":");
  const hashToTest = crypto.pbkdf2Sync(password, salt, 100_000, 64, "sha512").toString("hex");
  return originalHash === hashToTest;
}

/**
 * Validate a password for strict security requirements.
 * Returns null if the password is valid, or an error message string if invalid.
 */
export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return "Password must contain at least one lowercase letter.";
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return "Password must contain at least one uppercase letter.";
  }
  
  if (!/(?=.*[0-9])/.test(password)) {
    return "Password must contain at least one number.";
  }
  
  if (!/(?=.*[!@#$%^&*()[\]{}\-_=+|;:'",.<>/?`~])/.test(password)) {
    return "Password must contain at least one special character.";
  }

  // Prevent simple or sequential passwords
  const lowerPass = password.toLowerCase();
  const predictablePatterns = ["12345", "qwerty", "password", "abcde", "admin"];
  for (const pattern of predictablePatterns) {
    if (lowerPass.includes(pattern)) {
      return "Password is too predictable. Please avoid common sequences or words.";
    }
  }

  return null;
}

/**
 * Validate a phone number.
 * Strict validation: Blocks dummy numbers (1234567890, 9999999999).
 * If 10 digits, enforces Indian mobile number rules (starts with 6-9).
 */
export function validatePhone(phone: string): string | null {
  if (!phone) {
    return "Phone number is required.";
  }
  
  const cleanPhone = phone.replace(/[\s-]/g, "");
  
  // Basic length and character check (allowing country code + 4 to 15 digits)
  if (!/^\+?[0-9]{5,15}$/.test(cleanPhone)) {
    return "Invalid phone number format. Please provide a valid phone number.";
  }

  // Block sequential numbers (e.g., 1234567890, 0123456789, 9876543210)
  if (/012345678|123456789|987654321|876543210/.test(cleanPhone)) {
    return "Please provide a real phone number, not a sequence.";
  }

  // Block repetitive numbers (e.g., 9999999999, 1111111111)
  if (/^(\d)\1{6,}$/.test(cleanPhone.replace('+', ''))) {
    return "Please provide a real phone number, not repeated digits.";
  }

  // Enforce specific rules for Indian numbers (+91 or exactly 10 digits without +)
  const isIndianFormat = cleanPhone.startsWith('+91') || (/^\d{10}$/.test(cleanPhone));
  if (isIndianFormat) {
    const localPart = cleanPhone.startsWith('+91') ? cleanPhone.substring(3) : cleanPhone;
    if (localPart.length === 10 && !/^[6-9]\d{9}$/.test(localPart)) {
      return "Indian mobile numbers must start with 6, 7, 8, or 9.";
    }
  }

  return null;
}

/**
 * Validate an email address.
 * Strict validation: Requires standard email format.
 */
export function validateEmail(email: string): string | null {
  if (!email) {
    return "Email address is required.";
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(email)) {
    return "Please provide a valid email address (e.g., name@example.com).";
  }

  return null;
}

/**
 * Validate a user or business name.
 * Strict validation: Only letters, spaces, hyphens, and apostrophes. No numbers or special symbols.
 */
export function validateName(name: string): string | null {
  if (!name || name.trim().length < 2) {
    return "Name must be at least 2 characters long.";
  }
  
  const nameRegex = /^[A-Za-z\s'\-]{2,50}$/;
  if (!nameRegex.test(name)) {
    return "Name can only contain letters, spaces, hyphens, and apostrophes. No numbers or special characters are allowed.";
  }

  return null;
}

/**
 * Constant-time string comparison.
 *
 * `===` on secrets leaks length and prefix information through timing. Used for
 * OTP codes, where the search space is small enough (10^6) that a timing oracle
 * meaningfully helps an attacker.
 */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(String(a ?? ""), "utf8");
  const bufB = Buffer.from(String(b ?? ""), "utf8");
  // timingSafeEqual throws on length mismatch, which is itself a leak — hash
  // both sides first so the comparison is always over equal-length buffers.
  const hashA = crypto.createHash("sha256").update(bufA).digest();
  const hashB = crypto.createHash("sha256").update(bufB).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}
