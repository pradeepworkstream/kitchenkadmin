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

  const vendorCategoryMap = {
    // Spice Bazaar categories
    "Fresh Vegetables & Greens": "Spice Bazaar",
    "Frozen Vegetables & Produce": "Spice Bazaar",
    "Rice, Flours & Grains": "Spice Bazaar",
    "Dals & Pulses": "Spice Bazaar",
    "Nuts & Seeds": "Spice Bazaar",
    "Whole Spices": "Spice Bazaar",
    "Spice Powders & Masalas": "Spice Bazaar",
    "Sauces, Pastes & Chutneys": "Spice Bazaar",
    "Bakery, Snacks & Ready-to-Eat": "Spice Bazaar",
    "Dairy & Dessert Ingredients": "Spice Bazaar",
    // Mid East categories
    "Meat & Poultry": "Mid East",
    "Goat": "Mid East",
    "Fresh Vegetables & Herbs": "Mid East",
    "Rice, Flour & Grains": "Mid East",
    "Dals, Beans & Pulses": "Mid East",
    "Spices & Whole Masalas": "Mid East",
    "Spice Powders": "Mid East",
    "Sauces, Pastes & Condiments": "Mid East",
    "Coconut Products": "Mid East",
    "Frozen Items": "Mid East",
    "Bakery & Ready-to-Eat": "Mid East",
    "Miscellaneous": "Mid East",
    "Frequently Purchased Weekly": "Mid East",
    // Costco categories
    "Dairy & Refrigerated": "Costco",
    "Vegetables & Produce": "Costco",
    "Herbs": "Costco",
    "Citrus": "Costco",
    "Rice, Flour & Baking": "Costco",
    "Oils & Cooking Ingredients": "Costco",
    "Nuts & Dry Fruits": "Costco",
    "Beverages": "Costco",
    "Bread & Frozen": "Costco",
    "Cleaning Supplies": "Costco",
    "Disposable Restaurant Supplies": "Costco",
  };

  const vendorItemOverrides = {
    // Costco-specific overrides for ambiguous category collisions
    "Beverages|Bru Coffee": "Costco",
    "Beverages|Lamsa Tea": "Costco",
    "Beverages|Water Bottles": "Costco",
    "Beverages|Coconut Water": "Costco",
    "Beverages|Wagh Bakri Tea": "Costco",
    "Beverages|Thums Up": "Costco",
    "Nuts & Dry Fruits|Roasted Unsalted Cashews": "Costco",
    "Nuts & Dry Fruits|Raw Cashews": "Costco",
    "Nuts & Dry Fruits|Almonds": "Costco",
    "Nuts & Dry Fruits|Sliced Almonds": "Costco",
  };

  const itemKey = (item) => `${item.category}|${item.name}`;

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    try {
      await Inventory.collection.dropIndex("category_1_name_1");
      console.log("🧹 Dropped old category+name unique index");
    } catch (dropErr) {
      if (!/index not found/i.test(dropErr.message)) {
        throw dropErr;
      }
    }

    await Inventory.syncIndexes();
    console.log("🔧 Synced indexes");

    // Remove only existing inventory items (soft-deleted or active)
    const deleted = await Inventory.deleteMany({});
    console.log(`🧹 Cleared ${deleted.deletedCount} existing items`);

    const docs = INVENTORY_DATA.map((x) => ({
      category:     x.category,
      name:         x.name,
      vendor:
        x.vendor ||
        vendorItemOverrides[itemKey(x)] ||
        vendorCategoryMap[x.category] ||
        "",
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