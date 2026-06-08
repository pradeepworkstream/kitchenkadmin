import mongoose from "mongoose";

const VendorSchema = new mongoose.Schema(
  {
    name:      { type: String, required: true, trim: true, unique: true, index: true },
    email:     { type: String, default: "", trim: true },
    phone:     { type: String, default: "", trim: true },
    whatsapp:  { type: String, default: "", trim: true },
    logo:      { type: String, default: "" },
    active:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Vendor || mongoose.model("Vendor", VendorSchema);
