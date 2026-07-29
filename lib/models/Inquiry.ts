import mongoose, { Schema } from "mongoose";

const InquirySchema = new Schema({
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  email:     { type: String, required: true },
  phone:     { type: String, default: "" },
  message:   { type: String, required: true },
  status:    { type: String, enum: ["new", "responded", "closed"], default: "new" },
  createdAt: { type: Date, default: Date.now },
});

if (mongoose.models.Inquiry) {
  delete mongoose.models.Inquiry;
}

export const Inquiry = mongoose.model("Inquiry", InquirySchema);

