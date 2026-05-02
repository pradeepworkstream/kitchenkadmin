import dotenv from "dotenv";
import mongoose from "mongoose";

// Use Product model instead of Inventory
const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    category: { type: String, index: true },
    brandOptions: { type: [String], default: [] },
    unit: { type: String },
    isActive: { type: Boolean, default: true },
    regPrice: { type: Number, default: 0 },
    sizeText: { type: String },
    stock: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema);
import { INVENTORY_DATA } from "../data/inventoryData.js";

dotenv.config();

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Mongo connected");

    // optional: clear old data
    await Product.deleteMany({});
    console.log("🧹 Old products cleared");

    // insert
    const result = await Product.insertMany(
      INVENTORY_DATA.map((x) => ({
        name: x.name,
        category: x.category,
        brandOptions: x.brandOptions || [],
        unit: x.unit || "",
        regPrice: x.regPrice || 0,
        sizeText: x.sizeText || "",
        stock: 10, // Add some stock
        isActive: true,
      }))
    );

    console.log(`✅ Inserted ${result.length} product items`);
    process.exit(0);
  } catch (e) {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  }
}

seed();