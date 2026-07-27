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
