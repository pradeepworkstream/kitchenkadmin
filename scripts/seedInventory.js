// scripts/seedInventory.js
// Usage: npm run seed
import dotenv    from "dotenv";
import mongoose  from "mongoose";
import Inventory from "../models/Inventory.js";
import { INVENTORY_DATA } from "../data/inventoryData.js";

dotenv.config();

async function seed() {
  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI missing in .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // Remove only existing inventory items (soft-deleted or active)
    const deleted = await Inventory.deleteMany({});
    console.log(`🧹 Cleared ${deleted.deletedCount} existing items`);

    const docs = INVENTORY_DATA.map((x) => ({
      category:     x.category,
      name:         x.name,
      brandOptions: x.brandOptions || [],
      unit:         x.unit         || "",
      regPrice:     x.regPrice     || 0,
      sizeText:     x.sizeText     || "",
      stock:        10,        // default starting stock
      isActive:     true,
    }));

    const result = await Inventory.insertMany(docs, { ordered: false });
    console.log(`✅ Inserted ${result.length} inventory items`);
  } catch (err) {
    // ordered:false lets us see partial success; log duplicate key errors separately
    if (err.code === 11000) {
      console.warn("⚠️  Some items skipped (duplicate category+name)");
    } else {
      console.error("❌ Seed failed:", err.message);
      process.exit(1);
    }
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected");
    process.exit(0);
  }
}

seed();