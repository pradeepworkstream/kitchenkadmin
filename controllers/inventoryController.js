// controllers/inventoryController.js
import Inventory from "../models/Inventory.js";

/**
 * GET /api/inventory/list  |  GET /api/products
 * Supports: page, limit, search, category, stock (all|low|out)
 */
export const listInventory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      category = "",
      stock = "all",
    } = req.query;

    const pageNum  = Math.max(1, parseInt(page)  || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20)); // cap at 100

    const query = { isActive: true };

    if (search) {
      query.$or = [
        { name:     { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { unit:     { $regex: search, $options: "i" } },
      ];
    }

    if (category) query.category = category;

    if (stock === "low")      query.stock = { $gt: 0, $lte: 5 };
    else if (stock === "out") query.stock = 0;

    const skip  = (pageNum - 1) * limitNum;
    const total = await Inventory.countDocuments(query);
    const pages = Math.ceil(total / limitNum);

    const items = await Inventory.find(query)
      .sort({ category: 1, name: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean(); // plain JS objects — faster, less memory

    return res.json({ success: true, data: items, page: pageNum, pages, total });
  } catch (err) {
    console.error("listInventory error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/inventory
 * Admin → Create item
 */
export const createInventoryItem = async (req, res) => {
  try {
    const { category, name, brand, vendor, unit, regPrice, sizeText, stock } = req.body;

    if (!category?.trim() || !name?.trim()) {
      return res.status(400).json({ success: false, message: "Category and Name are required" });
    }

    const item = await Inventory.create({
      category: category.trim(),
      name:     name.trim(),
      brand:    brand    || "",
      vendor:   vendor   || "",
      unit:     unit     || "",
      regPrice: Number(regPrice) || 0,
      sizeText: sizeText || "",
      stock:    Number(stock)    || 0,
    });

    return res.status(201).json({ success: true, item });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Item already exists in this category",
      });
    }
    console.error("createInventoryItem error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/inventory/:id
 * Admin → Update item (full update)
 */
export const updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent overwriting protected fields via body
    const { _id, __v, ...updateData } = req.body;

    const item = await Inventory.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    return res.json({ success: true, item });
  } catch (err) {
    console.error("updateInventoryItem error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/inventory/:id
 * Admin → Soft delete
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
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    return res.json({ success: true, message: "Item deactivated" });
  } catch (err) {
    console.error("deleteInventoryItem error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/inventory/:id/stock
 * Auth user → Update stock quantity only
 */
export const updateInventoryStock = async (req, res) => {
  try {
    const { id } = req.params;
    const stock = parseInt(req.body.stock);

    if (isNaN(stock) || stock < 0) {
      return res.status(400).json({
        success: false,
        message: "Stock must be a non-negative integer",
      });
    }

    const item = await Inventory.findByIdAndUpdate(
      id,
      { stock },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    return res.json({ success: true, item });
  } catch (err) {
    console.error("updateInventoryStock error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};