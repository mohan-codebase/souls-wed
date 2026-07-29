import mongoose, { Schema } from "mongoose";

const AdminSchema = new Schema({
  name:         { type: String, required: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },

  // Admin was the ONLY role that could not enable 2FA — and the most privileged.
  // Opt-in (unlike User, which defaults to on) so existing accounts are not
  // locked out by a deploy.
  twoFactorEnabled: { type: Boolean, default: false },
  profileImage: { type: String, default: "" },
  role:         { type: String, default: "admin" }, // admin, superadmin, moderator
  isEmailVerified: { type: Boolean, default: false },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  createdAt:    { type: Date, default: Date.now },
});

export const Admin =
  mongoose.models.Admin ?? mongoose.model("Admin", AdminSchema);
