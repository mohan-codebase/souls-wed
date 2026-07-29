import mongoose, { Schema } from "mongoose";

const VendorReviewSchema = new Schema({
  id:        { type: Number },
  author:    { type: String },
  avatar:    { type: String },
  date:      { type: String },
  rating:    { type: Number },
  text:      { type: String },
  userId:    { type: Schema.Types.ObjectId, ref: "User" },
  bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
});

const VendorFaqSchema = new Schema({
  question: { type: String },
  answer:   { type: String },
});

const VendorSchema = new Schema({
  name:         { type: String, required: true },
  businessName: { type: String },  // Brand/business name — was missing before, signup data was silently dropped
  email:        { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  passwordHash: { type: String },

  // Vendors had no 2FA option despite holding customer contact data.
  // Opt-in (unlike User, which defaults to on) so existing accounts are not
  // locked out by a deploy.
  twoFactorEnabled: { type: Boolean, default: false },
  googleId:     { type: String, unique: true, sparse: true },
  phone:        { type: String },
  category:     { type: String }, // Legacy, kept for backwards compatibility during migration
  categories:   [{ type: String }], // E.g. ["venues", "rooms", "planners", "caterers", "decorators"]
  city:         { type: String, required: true },
  country:      { type: String, default: "India" },
  description:  { type: String, default: "" },
  website:      { type: String, default: "" },
  instagram:    { type: String, default: "" },
  rating:       { type: Number, default: 0 },
  reviewCount:  { type: Number, default: 0 },
  priceFrom:    { type: Number }, // Base starting price for generic showcase
  advancePercentage: { type: Number, default: 30 }, // Default 30% advance
  unavailableDates: [{ type: Date }],
  profileImage: { type: String, default: "" },
  images:       [{ type: String }],
  faqs:         [VendorFaqSchema],
  reviews:      [VendorReviewSchema],
  featured:     { type: Boolean, default: false },
  verified:     { type: Boolean, default: false }, // Admin verification
  isEmailVerified: { type: Boolean, default: false }, // Email OTP verification
  available:    { type: Boolean, default: true },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  lastLoginAt:  { type: Date },
  lastLoginDevice: { type: String },
  lastLoginMethod: { type: String }, // "google" or "password"
  createdAt:    { type: Date, default: Date.now },
});

export const Vendor =
  mongoose.models.Vendor ?? mongoose.model("Vendor", VendorSchema);
