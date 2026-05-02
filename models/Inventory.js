// models/Inventory.js
import mongoose from "mongoose";

const InventorySchema = new mongoose.Schema(
  {
    category: { type: String, required: true, trim: true, index: true },
    name: { type: String, required: true, trim: true, index: true },

    // dropdown
    brandOptions: { type: [String], default: [] },

    // used on UI next to qty input (LB/Bags/Packs/etc)
    unit: { type: String, default: "" },

    // stock quantity
    stock: { type: Number, default: 0 },

    // optional (if you want later)
    regPrice: { type: Number, default: 0 },
    sizeText: { type: String, default: "" }, // e.g., "10lb", "4lb", "28oz"
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// prevent duplicates (same category + same name)
InventorySchema.index({ category: 1, name: 1 }, { unique: true });

export default mongoose.model("Inventory", InventorySchema);