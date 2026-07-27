/**
 * BOOKING MODEL
 * 
 * This is the MongoDB schema for bookings. Think of it as a "blueprint"
 * that defines what a booking document looks like in the database.
 * 
 * EVERY booking goes through this lifecycle:
 * 
 *   pending → confirmed → completed
 *                       → cancelled
 * 
 * "pending"   = User submitted the form, payment not yet received
 * "confirmed" = Payment verified by Stripe, booking is locked in
 * "completed" = The event date has passed, service was delivered
 * "cancelled" = Either user or vendor cancelled before the event
 * 
 * WHY SEPARATE "venue" AND "room" BOOKING TYPES?
 * 
 * Both use the same schema, but differ in date handling:
 * - Venue booking: uses `eventDate` (a single day — the wedding day)
 * - Room booking:  uses `checkIn` + `checkOut` (a range of nights)
 * 
 * This means one Booking model handles both categories — no need
 * for separate VenueBooking and RoomBooking models.
 */

import mongoose, { Schema } from "mongoose";

const BookingSchema = new Schema({
  // ─── WHO is booking? ───────────────────────────────────────
  // Points to the User who made this booking
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // We also COPY the user's name/email/phone directly onto the booking.
  // This is called "denormalization" — it means faster reads because
  // we don't need to JOIN with the User collection every time we
  // display a booking in a dashboard.
  userName:  { type: String, required: true },
  userEmail: { type: String, required: true },
  userPhone: { type: String },

  // ─── WHAT is being booked? ────────────────────────────────
  // providerId matches the `id` field in venues-data.ts or Vendor `_id`
  providerId:   { type: String, required: true },
  providerName: { type: String, required: true },

  // The category of the booking (e.g. "venue", "room", "planner", "photographer")
  bookingType: {
    type: String,
    required: true,
  },

  // ─── WHEN? ────────────────────────────────────────────────
  // For VENUE/VENDOR bookings: an array of multiple event dates
  eventDates: [{ type: Date }],
  // Keeping eventDate for backward compatibility
  eventDate: { type: Date },

  // For ROOM bookings: a range (check-in to check-out)
  checkIn:  { type: Date },
  checkOut: { type: Date },

  // ─── HOW MANY? ────────────────────────────────────────────
  guestCount: { type: Number },
  roomCount:  { type: Number },

  // ─── PRICING ──────────────────────────────────────────────
  // totalAmount  = the full calculated price (e.g., ₹5,00,000)
  // advanceAmount = 30% of total that the user pays now to confirm
  totalAmount:   { type: Number, required: true },
  advanceAmount: { type: Number, required: true },
  currency:      { type: String, default: "INR" },

  // ─── STATUS LIFECYCLE ─────────────────────────────────────
  //
  //   ┌─────────┐    payment    ┌───────────┐    event done    ┌───────────┐
  //   │ pending  │───verified──►│ confirmed │──────────────────►│ completed │
  //   └─────────┘              └───────────┘                  └───────────┘
  //        │                        │
  //        │   user/vendor          │  user/vendor
  //        │   cancels              │  cancels
  //        ▼                        ▼
  //   ┌───────────┐          ┌───────────┐
  //   │ cancelled │          │ cancelled │
  //   └───────────┘          └───────────┘
  //
  status: {
    type: String,
    enum: ["pending", "confirmed", "completed", "cancelled"],
    default: "pending",
  },

  // ─── PAYMENT (Stripe) ─────────────────────────────────────
  // stripeSessionId: set by create-order, verified by verify-payment
  stripeSessionId: { type: String },

  // ─── EVENT DETAILS ────────────────────────────────────────
  functionType:   { type: String },    // "wedding", "pre-wedding", "reception"
  functionTime:   { type: String },    // "day", "evening"
  specialRequests: { type: String, default: "" },
  notifyWhatsapp: { type: Boolean, default: false },

  // ─── TIMESTAMPS ───────────────────────────────────────────
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Pre-save hook: automatically update `updatedAt` on every save
BookingSchema.pre("save", function () {
  this.updatedAt = new Date();
});

// Force delete the cached model so Next.js hot-reload picks up schema changes
if (mongoose.models.Booking) {
  delete mongoose.models.Booking;
}

export const Booking = mongoose.model("Booking", BookingSchema);
