// controllers/inventoryController.js
import Inventory from "../models/Inventory.js";

/**
 * GET /api/inventory/list or /api/products
 * Used by Admin table with pagination and filters
 */
export const listInventory = async (req, res) => {
  try {
    console.log("🔍 Starting inventory list query...");
    const { page = 1, limit = 20, search = "", category = "", stock = "all" } = req.query;

    const query = { isActive: true };

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { unit: { $regex: search, $options: "i" } },
      ];
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Stock filter
    if (stock === "low") {
      query.stock = { $lte: 5 };
    } else if (stock === "out") {
      query.stock = 0;
    }

    const skip = (page - 1) * limit;
    const total = await Inventory.countDocuments(query);
    const pages = Math.ceil(total / limit);

    const items = await Inventory.find(query)
      .sort({ category: 1, name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    console.log(`✅ Found ${items.length} inventory items (page ${page}/${pages})`);
    return res.json({ success: true, data: items, page: parseInt(page), pages });
  } catch (err) {
    console.error("❌ Error in listInventory:", err);
    return res.json({ success: false, message: err.message });
  }
};

/**
 * POST /api/inventory
 * Admin → Create item
 */
export const createInventoryItem = async (req, res) => {
  try {
    const { category, name, brandOptions, unit, regPrice, sizeText, stock } = req.body;

    if (!category || !name) {
      return res.json({ success: false, message: "Category and Name are required" });
    }

    const item = await Inventory.create({
      category: category.trim(),
      name: name.trim(),
      brandOptions: brandOptions || [],
      unit: unit || "",
      regPrice: regPrice || 0,
      sizeText: sizeText || "",
      stock: stock || 0,
    });

    return res.json({ success: true, item });
  } catch (err) {
    if (err.code === 11000) {
      return res.json({
        success: false,
        message: "Item already exists in this category",
      });
    }

    console.error(err);
    return res.json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/inventory/:id
 * Admin → Update item
 */
export const updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Inventory.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.json({ success: false, message: "Item not found" });
    }

    return res.json({ success: true, item });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/inventory/:id
 * Admin → Soft delete (recommended)
 */
export const deleteInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Inventory.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!item) {
      return res.json({ success: false, message: "Item not found" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: err.message });
  }
};