// scripts/backfillQuantityUnit.js
// Usage: npm run backfill
import dotenv from "dotenv";
import mongoose from "mongoose";
import Inventory from "../models/Inventory.js";

dotenv.config();

async function backfill() {
  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI missing in .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    const quantityResult = await Inventory.updateMany(
      {
        $or: [
          { quantityNeeded: { $exists: false } },
          { quantityNeeded: null },
        ],
      },
      { $set: { quantityNeeded: 1 } }
    );

    const unitResult = await Inventory.updateMany(
      {
        $or: [
          { unit: { $exists: false } },
          { unit: null },
          { unit: "" },
        ],
      },
      { $set: { unit: "Box" } }
    );

    console.log(`✅ Backfilled quantityNeeded on ${quantityResult.modifiedCount} item(s)`);
    console.log(`✅ Backfilled unit on ${unitResult.modifiedCount} item(s)`);

    const total = await Inventory.countDocuments();
    console.log(`ℹ️  Total inventory items: ${total}`);
  } catch (err) {
    console.error("❌ Backfill failed:", err.message || err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected");
    process.exit(0);
  }
}

backfill();
