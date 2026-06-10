// models/Inventory.js
import mongoose from "mongoose";

const InventorySchema = new mongoose.Schema(
  {
    vendor: { type: String, required: true, trim: true, index: true },
    category: { type: String, required: true, trim: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    unit: { type: String, default: "Box", trim: true },
    quantityNeeded: { type: Number, default: 1 },
    defaultPrice: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// prevent duplicates (same category + same name)
InventorySchema.index({ vendor: 1, category: 1, name: 1 }, { unique: true });

export default mongoose.model("Inventory", InventorySchema);