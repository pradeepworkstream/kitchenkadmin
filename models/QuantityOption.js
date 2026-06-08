import mongoose from "mongoose";

const QuantityOptionSchema = new mongoose.Schema(
  {
    value: { type: Number, required: true, unique: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.models.QuantityOption || mongoose.model("QuantityOption", QuantityOptionSchema);
