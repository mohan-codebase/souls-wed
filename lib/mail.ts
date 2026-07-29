import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_PORT === "465", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

/**
 * Sends a notification email upon successful login.
 */
export async function sendLoginNotificationEmail(
  to: string,
  name: string,
  role: string,
  userAgent?: string
) {
  // If SMTP environment variables are not configured, skip sending and log a warning.
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("SMTP credentials are not fully configured. Skipping login notification email to:", to);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || "SoulsWed Security"}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: "New Login Detected - SoulsWed",
      html: `
        <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #DEE2E6; border-radius: 8px;">
          <h2 style="color: #EE7429; margin-top: 0;">New Login Alert</h2>
          <p style="color: #1A1A1A; font-size: 16px;">Hello ${name},</p>
          <p style="color: #4a4a4a; line-height: 1.5;">We noticed a new login to your <strong>${role}</strong> account at SoulsWed.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #FCCB11;">
            <p style="margin: 5px 0; color: #1A1A1A;"><strong>Date & Time:</strong> ${new Date().toLocaleString()}</p>
            ${userAgent ? `<p style="margin: 5px 0; color: #1A1A1A;"><strong>Device/Browser:</strong> ${userAgent}</p>` : ""}
          </div>
          
          <p style="color: #4a4a4a; line-height: 1.5;">If this was you, you can safely ignore this email.</p>
          <p style="color: #4a4a4a; line-height: 1.5;">If you did not authorize this login, please secure your account immediately by resetting your password.</p>
          <br>
          <p style="color: #4a4a4a; line-height: 1.5;">Best regards,<br><strong style="color: #1A1A1A;">SoulsWed Security Team</strong></p>
        </div>
      `,
    });
    console.log("Login notification email sent to %s, messageId: %s", to, info.messageId);
  } catch (error) {
    console.error("Error sending login notification email:", error);
  }
}

/**
 * Sends an OTP email for account verification.
 */
export async function sendVerificationOtpEmail(to: string, name: string, otpCode: string) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("SMTP credentials missing. Would have sent OTP %s to %s", otpCode, to);
    // For development, if no SMTP is set, we just log it so we can test the flow.
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || "SoulsWed Security"}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: "Verify your Email - SoulsWed",
      html: `
        <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #DEE2E6; border-radius: 8px;">
          <h2 style="color: #EE7429; margin-top: 0;">Verify your Email Address</h2>
          <p style="color: #1A1A1A; font-size: 16px;">Hello ${name},</p>
          <p style="color: #4a4a4a; line-height: 1.5;">Thank you for registering at SoulsWed. Please use the following One-Time Password (OTP) to verify your email address and complete your registration:</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center; border: 1px dashed #FCCB11;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1A1A1A;">${otpCode}</span>
          </div>
          
          <p style="color: #4a4a4a; line-height: 1.5; font-size: 14px;">This code is valid for 15 minutes. If you did not request this, please ignore this email.</p>
          <br>
          <p style="color: #4a4a4a; line-height: 1.5;">Best regards,<br><strong style="color: #1A1A1A;">SoulsWed Team</strong></p>
        </div>
      `,
    });
    console.log("OTP email sent to %s, messageId: %s", to, info.messageId);
  } catch (error) {
    console.error("Error sending OTP email:", error);
  }
}

/**
 * Sends a password reset email.
 */
export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("SMTP credentials missing. Would have sent reset link %s to %s", resetUrl, to);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || "SoulsWed Security"}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: "Reset your Password - SoulsWed",
      html: `
        <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #DEE2E6; border-radius: 8px;">
          <h2 style="color: #EE7429; margin-top: 0;">Password Reset Request</h2>
          <p style="color: #1A1A1A; font-size: 16px;">Hello ${name},</p>
          <p style="color: #4a4a4a; line-height: 1.5;">We received a request to reset your password for your SoulsWed account. You can reset your password by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #EE7429; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Reset Password</a>
          </div>
          
          <p style="color: #4a4a4a; line-height: 1.5; font-size: 14px;">If the button above does not work, copy and paste the following link into your browser:</p>
          <p style="color: #4a4a4a; line-height: 1.5; font-size: 12px; word-break: break-all;">
            <a href="${resetUrl}" style="color: #EE7429;">${resetUrl}</a>
          </p>
          
          <p style="color: #4a4a4a; line-height: 1.5; font-size: 14px;">This link is valid for 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
          <br>
          <p style="color: #4a4a4a; line-height: 1.5;">Best regards,<br><strong style="color: #1A1A1A;">SoulsWed Security Team</strong></p>
        </div>
      `,
    });
    console.log("Password reset email sent to %s, messageId: %s", to, info.messageId);
  } catch (error) {
    console.error("Error sending password reset email:", error);
  }
}

/**
 * Notifies the SoulsWed moderation inbox that a vendor has uploaded media.
 *
 * Uploads arrive in bursts (the gallery editor fires one request per file), so
 * callers batch a burst into a single call rather than emailing per file.
 */
export async function sendUploadNotificationEmail(params: {
  vendorName: string;
  vendorEmail: string;
  vendorId: string;
  imageCount: number;
  videoCount: number;
}) {
  const to = process.env.UPLOAD_NOTIFY_EMAIL || "soulswed99@gmail.com";

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("SMTP credentials are not fully configured. Skipping upload notification for vendor:", params.vendorId);
    return;
  }

  const { vendorName, vendorEmail, vendorId, imageCount, videoCount } = params;
  const parts: string[] = [];
  if (imageCount > 0) parts.push(`${imageCount} ${imageCount === 1 ? "photo" : "photos"}`);
  if (videoCount > 0) parts.push(`${videoCount} ${videoCount === 1 ? "video" : "videos"}`);
  const summary = parts.join(" and ") || "media";

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || "SoulsWed"}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: `New upload for review — ${vendorName} (${summary})`,
      html: `
        <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #DEE2E6; border-radius: 8px;">
          <h2 style="color: #EE7429; margin-top: 0;">New Media Awaiting Review</h2>
          <p style="color: #4a4a4a; line-height: 1.5;">A vendor has just uploaded <strong>${summary}</strong> to their listing.</p>

          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #FCCB11;">
            <p style="margin: 5px 0; color: #1A1A1A;"><strong>Vendor:</strong> ${vendorName}</p>
            <p style="margin: 5px 0; color: #1A1A1A;"><strong>Email:</strong> ${vendorEmail}</p>
            <p style="margin: 5px 0; color: #1A1A1A;"><strong>Vendor ID:</strong> ${vendorId}</p>
            <p style="margin: 5px 0; color: #1A1A1A;"><strong>Uploaded:</strong> ${new Date().toLocaleString()}</p>
          </div>

          <p style="color: #4a4a4a; line-height: 1.5;">Please review this content in the admin dashboard and remove anything that breaches the content policy.</p>
          <br>
          <p style="color: #4a4a4a; line-height: 1.5;">— <strong style="color: #1A1A1A;">SoulsWed Platform</strong></p>
        </div>
      `,
    });
    console.log("Upload notification email sent to %s, messageId: %s", to, info.messageId);
  } catch (error) {
    console.error("Error sending upload notification email:", error);
  }
}

/**
 * Notifies the admin inbox of a new contact-form inquiry.
 */
export async function sendInquiryNotificationEmail(params: {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
}) {
  const to = process.env.UPLOAD_NOTIFY_EMAIL || "soulswed99@gmail.com";

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("SMTP credentials are not fully configured. Skipping inquiry notification from:", params.email);
    return;
  }

  const { firstName, lastName, email, message } = params;

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || "SoulsWed"}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      replyTo: email,
      subject: `New consultation inquiry from ${firstName} ${lastName}`,
      html: `
        <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #DEE2E6; border-radius: 8px;">
          <h2 style="color: #EE7429; margin-top: 0;">New Consultation Request</h2>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #FCCB11;">
            <p style="margin: 5px 0; color: #1A1A1A;"><strong>Name:</strong> ${firstName} ${lastName}</p>
            <p style="margin: 5px 0; color: #1A1A1A;"><strong>Email:</strong> ${email}</p>
          </div>
          <p style="color: #4a4a4a; line-height: 1.5; white-space: pre-line;">${message}</p>
        </div>
      `,
    });
    console.log("Inquiry notification email sent to %s, messageId: %s", to, info.messageId);
  } catch (error) {
    console.error("Error sending inquiry notification email:", error);
  }
}

/**
 * Notifies the admin inbox of a new newsletter subscriber.
 */
export async function sendSubscriberNotificationEmail(email: string) {
  const to = process.env.UPLOAD_NOTIFY_EMAIL || "soulswed99@gmail.com";

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("SMTP credentials are not fully configured. Skipping subscriber notification for:", email);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || "SoulsWed"}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: "New newsletter subscriber",
      html: `
        <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #DEE2E6; border-radius: 8px;">
          <h2 style="color: #EE7429; margin-top: 0;">New Newsletter Subscriber</h2>
          <p style="color: #1A1A1A; font-size: 16px;">${email}</p>
        </div>
      `,
    });
    console.log("Subscriber notification email sent to %s, messageId: %s", to, info.messageId);
  } catch (error) {
    console.error("Error sending subscriber notification email:", error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BOOKING NOTIFICATIONS
//
// Until these existed, a booking generated no email whatsoever — the customer
// got no confirmation, the vendor was never told a lead had arrived, and the
// admin inbox stayed silent. The only way anyone found out was by logging in
// and looking. See AUDIT-REPORT.md #4.
//
// Every function here is safe to call fire-and-forget (see `dispatch` below).
// They swallow their own errors: a booking must never fail because SMTP is
// slow or down.
// ═══════════════════════════════════════════════════════════════════════════

/** Shape we need off a Booking document to render an email. */
export interface BookingEmailData {
  _id: unknown;
  // Mongoose hands back `null` for unset optional fields, so every one of
  // these is nullable — otherwise callers have to launder `booking.toObject()`
  // through a cast at each call site.
  userName?: string | null;
  userEmail?: string | null;
  userPhone?: string | null;
  providerName?: string | null;
  bookingType?: string | null;
  eventDate?: Date | string | null;
  eventDates?: (Date | string)[] | null;
  checkIn?: Date | string | null;
  checkOut?: Date | string | null;
  guestCount?: number | null;
  roomCount?: number | null;
  totalAmount?: number | null;
  advanceAmount?: number | null;
  amountPaid?: number | null;
  currency?: string | null;
  functionType?: string | null;
  specialRequests?: string | null;
  cancellationReason?: string | null;
  cancelledBy?: string | null;
}

const adminInbox = () => process.env.UPLOAD_NOTIFY_EMAIL || "soulswed99@gmail.com";
const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

function smtpReady(context: string): boolean {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(`SMTP credentials are not fully configured. Skipping ${context}.`);
    return false;
  }
  return true;
}

/**
 * Fire-and-forget an email. Callers use this so a slow SMTP server never holds
 * up an HTTP response — the same mistake that made every login take 10-15s.
 */
export function dispatch(task: Promise<unknown>, label: string): void {
  void task.catch((err) => console.error(`[mail] ${label} failed:`, err));
}

const money = (amount?: number | null, currency?: string | null) => {
  amount = amount ?? 0;
  currency = currency || "INR";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
};

const day = (d?: Date | string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

/** Human-readable dates line, whatever kind of booking it is. */
function datesLabel(b: BookingEmailData): string {
  if (b.bookingType === "room" && b.checkIn && b.checkOut) {
    return `${day(b.checkIn)} → ${day(b.checkOut)}`;
  }
  if (b.eventDates?.length) return b.eventDates.map(day).join(", ");
  return day(b.eventDate);
}

const ref = (b: BookingEmailData) => String(b._id).slice(-8).toUpperCase();

/** The grey detail panel shared by all booking emails. */
function detailsPanel(b: BookingEmailData): string {
  const rows: [string, string][] = [
    ["Reference", ref(b)],
    ["Booking", b.providerName || "—"],
    ["Dates", datesLabel(b)],
  ];
  if (b.guestCount) rows.push(["Guests", String(b.guestCount)]);
  if (b.roomCount) rows.push(["Rooms", String(b.roomCount)]);
  if (b.functionType) rows.push(["Occasion", b.functionType]);
  rows.push(["Total", money(b.totalAmount, b.currency)]);

  return `
    <div style="background-color:#f8f9fa;padding:15px;border-radius:5px;margin:20px 0;border-left:4px solid #FCCB11;">
      ${rows
        .map(
          ([k, v]) =>
            `<p style="margin:5px 0;color:#1A1A1A;"><strong>${k}:</strong> ${v}</p>`
        )
        .join("")}
    </div>`;
}

function shell(heading: string, body: string): string {
  return `
    <div style="font-family:'Plus Jakarta Sans',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #DEE2E6;border-radius:8px;">
      <h2 style="color:#EE7429;margin-top:0;">${heading}</h2>
      ${body}
      <br>
      <p style="color:#4a4a4a;line-height:1.5;">Best regards,<br><strong style="color:#1A1A1A;">SoulsWed</strong></p>
    </div>`;
}

async function send(to: string, subject: string, html: string, label: string) {
  const info = await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME || "SoulsWed"}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
  console.log("%s sent to %s, messageId: %s", label, to, info.messageId);
}

/**
 * A booking has just been created and is awaiting payment.
 * Goes to the customer, the vendor (if we can resolve their address), and admin.
 */
export async function sendBookingCreatedEmails(b: BookingEmailData, vendorEmail?: string) {
  if (!smtpReady("booking-created notifications")) return;

  const payUrl = `${siteUrl()}/checkout/${String(b._id)}`;

  try {
    if (b.userEmail) {
      await send(
        b.userEmail,
        `Booking request received — ${b.providerName}`,
        shell(
          "We've got your booking request",
          `<p style="color:#1A1A1A;font-size:16px;">Hello ${b.userName || "there"},</p>
           <p style="color:#4a4a4a;line-height:1.5;">Your request for <strong>${b.providerName}</strong> is in. It isn't confirmed yet — the dates are held for you until the advance is paid.</p>
           ${detailsPanel(b)}
           <p style="color:#4a4a4a;line-height:1.5;">Advance to confirm: <strong>${money(b.advanceAmount, b.currency)}</strong>. The balance is settled directly with the venue.</p>
           <p style="margin:25px 0;"><a href="${payUrl}" style="background-color:#EE7429;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;display:inline-block;">Pay advance &amp; confirm</a></p>`
        ),
        "Booking created (customer)"
      );
    }

    if (vendorEmail) {
      await send(
        vendorEmail,
        `New booking request — ${b.providerName} (${datesLabel(b)})`,
        shell(
          "You have a new booking request",
          `<p style="color:#4a4a4a;line-height:1.5;">A customer has requested <strong>${b.providerName}</strong>. It's awaiting their advance payment — we'll email you again the moment it's confirmed.</p>
           ${detailsPanel(b)}
           <div style="background-color:#fff8f0;padding:15px;border-radius:5px;margin:20px 0;border-left:4px solid #EE7429;">
             <p style="margin:5px 0;color:#1A1A1A;"><strong>Customer:</strong> ${b.userName || "—"}</p>
             <p style="margin:5px 0;color:#1A1A1A;"><strong>Phone:</strong> ${b.userPhone || "—"}</p>
             <p style="margin:5px 0;color:#1A1A1A;"><strong>Email:</strong> ${b.userEmail || "—"}</p>
           </div>
           ${b.specialRequests ? `<p style="color:#4a4a4a;line-height:1.5;"><strong>Special requests:</strong><br>${b.specialRequests}</p>` : ""}
           <p style="margin:25px 0;"><a href="${siteUrl()}/vendor/dashboard" style="background-color:#EE7429;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;display:inline-block;">Open partner portal</a></p>`
        ),
        "Booking created (vendor)"
      );
    }

    await send(
      adminInbox(),
      `New booking ${ref(b)} — ${b.providerName}`,
      shell(
        "New booking created",
        `<p style="color:#4a4a4a;line-height:1.5;">Awaiting payment of ${money(b.advanceAmount, b.currency)}.</p>
         ${detailsPanel(b)}
         <p style="color:#4a4a4a;line-height:1.5;">Customer: ${b.userName} · ${b.userEmail} · ${b.userPhone || "no phone"}</p>`
      ),
      "Booking created (admin)"
    );
  } catch (error) {
    console.error("Error sending booking-created emails:", error);
  }
}

/** Payment received — the booking is now locked in. Customer + vendor. */
export async function sendBookingConfirmedEmails(b: BookingEmailData, vendorEmail?: string) {
  if (!smtpReady("booking-confirmed notifications")) return;

  const balance = Math.max(0, (b.totalAmount || 0) - (b.amountPaid || 0));

  try {
    if (b.userEmail) {
      await send(
        b.userEmail,
        `Booking confirmed — ${b.providerName}`,
        shell(
          "Your booking is confirmed",
          `<p style="color:#1A1A1A;font-size:16px;">Hello ${b.userName || "there"},</p>
           <p style="color:#4a4a4a;line-height:1.5;">Payment received — <strong>${b.providerName}</strong> is confirmed for you.</p>
           ${detailsPanel(b)}
           <div style="background-color:#f0fdf4;padding:15px;border-radius:5px;margin:20px 0;border-left:4px solid #16a34a;">
             <p style="margin:5px 0;color:#1A1A1A;"><strong>Paid:</strong> ${money(b.amountPaid, b.currency)}</p>
             ${balance > 0 ? `<p style="margin:5px 0;color:#1A1A1A;"><strong>Balance at venue:</strong> ${money(balance, b.currency)}</p>` : ""}
           </div>
           <p style="color:#4a4a4a;line-height:1.5;">Keep reference <strong>${ref(b)}</strong> handy when you speak to the venue.</p>`
        ),
        "Booking confirmed (customer)"
      );
    }

    if (vendorEmail) {
      await send(
        vendorEmail,
        `Booking CONFIRMED — ${b.providerName} (${datesLabel(b)})`,
        shell(
          "A booking has been confirmed",
          `<p style="color:#4a4a4a;line-height:1.5;">The customer has paid their advance. Please block these dates.</p>
           ${detailsPanel(b)}
           <div style="background-color:#fff8f0;padding:15px;border-radius:5px;margin:20px 0;border-left:4px solid #EE7429;">
             <p style="margin:5px 0;color:#1A1A1A;"><strong>Customer:</strong> ${b.userName || "—"}</p>
             <p style="margin:5px 0;color:#1A1A1A;"><strong>Phone:</strong> ${b.userPhone || "—"}</p>
             <p style="margin:5px 0;color:#1A1A1A;"><strong>Balance to collect at venue:</strong> ${money(balance, b.currency)}</p>
           </div>`
        ),
        "Booking confirmed (vendor)"
      );
    }
  } catch (error) {
    console.error("Error sending booking-confirmed emails:", error);
  }
}

/** Booking cancelled or declined. Customer + vendor, with the reason. */
export async function sendBookingCancelledEmails(b: BookingEmailData, vendorEmail?: string) {
  if (!smtpReady("booking-cancelled notifications")) return;

  const by = b.cancelledBy === "vendor" ? "the venue" : b.cancelledBy === "admin" ? "SoulsWed" : "you";
  const refund = b.amountPaid || 0;

  try {
    if (b.userEmail) {
      await send(
        b.userEmail,
        `Booking cancelled — ${b.providerName}`,
        shell(
          "Your booking has been cancelled",
          `<p style="color:#1A1A1A;font-size:16px;">Hello ${b.userName || "there"},</p>
           <p style="color:#4a4a4a;line-height:1.5;">Booking <strong>${ref(b)}</strong> for <strong>${b.providerName}</strong> was cancelled by ${by}.</p>
           ${b.cancellationReason ? `<p style="color:#4a4a4a;line-height:1.5;"><strong>Reason:</strong> ${b.cancellationReason}</p>` : ""}
           ${detailsPanel(b)}
           ${refund > 0 ? `<p style="color:#4a4a4a;line-height:1.5;">A refund of <strong>${money(refund, b.currency)}</strong> is being processed and will reach your original payment method.</p>` : ""}`
        ),
        "Booking cancelled (customer)"
      );
    }

    if (vendorEmail) {
      await send(
        vendorEmail,
        `Booking cancelled — ${b.providerName} (${datesLabel(b)})`,
        shell(
          "A booking was cancelled",
          `<p style="color:#4a4a4a;line-height:1.5;">Booking <strong>${ref(b)}</strong> was cancelled by ${by}. These dates are now available again.</p>
           ${b.cancellationReason ? `<p style="color:#4a4a4a;line-height:1.5;"><strong>Reason:</strong> ${b.cancellationReason}</p>` : ""}
           ${detailsPanel(b)}`
        ),
        "Booking cancelled (vendor)"
      );
    }
  } catch (error) {
    console.error("Error sending booking-cancelled emails:", error);
  }
}
