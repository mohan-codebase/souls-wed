import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema({
  name:         { type: String, required: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String },
  googleId:     { type: String, unique: true, sparse: true },
  phone:        { type: String },
  profileImage: { type: String, default: "" },
  role:         { type: String, default: "user" }, // user, couple
  isEmailVerified: { type: Boolean, default: false },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  lastLoginAt:  { type: Date },
  lastLoginDevice: { type: String },
  lastLoginMethod: { type: String }, // "google" or "password"
  createdAt:    { type: Date, default: Date.now },
});

export const User =
  mongoose.models.User ?? mongoose.model("User", UserSchema);
