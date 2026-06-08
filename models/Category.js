import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
  {
    vendor: { type: String, required: true, trim: true, index: true },
    name:   { type: String, required: true, trim: true, index: true },
  },
  { timestamps: true }
);

CategorySchema.index({ vendor: 1, name: 1 }, { unique: true });

export default mongoose.models.Category || mongoose.model("Category", CategorySchema);
