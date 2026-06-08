import mongoose from "mongoose";

const UnitSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.models.Unit || mongoose.model("Unit", UnitSchema);
