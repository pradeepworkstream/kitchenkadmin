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
      vendor = "",
    } = req.query;

    const pageNum  = Math.max(1, parseInt(page)  || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20)); // cap at 100

    const query = {};

    if (search) {
      query.$or = [
        { name:     { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { unit:     { $regex: search, $options: "i" } },
      ];
    }

    if (category) query.category = category;
    if (vendor) query.vendor = vendor;

    const skip  = (pageNum - 1) * limitNum;
    const total = await Inventory.countDocuments(query);
    const pages = Math.ceil(total / limitNum);

    const items = (await Inventory.find(query)
      .sort({ category: 1, name: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean())
      .map((item) => ({
        ...item,
        unit:           item.unit || "Box",
        quantityNeeded: item.quantityNeeded ?? 1,
      }));

    return res.json({ success: true, data: items, page: pageNum, pages, total });
  } catch (err) {
    console.error("listInventory error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const listInventoryCategories = async (req, res) => {
  try {
    const { vendor = "" } = req.query;
    const query = { isActive: true };
    if (vendor) query.vendor = vendor;

    const categories = await Inventory.distinct("category", query);
    categories.sort((a, b) => a.localeCompare(b));

    return res.json({ success: true, data: categories });
  } catch (err) {
    console.error("listInventoryCategories error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/inventory
 * Admin → Create item
 */
export const createInventoryItem = async (req, res) => {
  try {
    const { vendor, category, name, quantityNeeded, unit } = req.body;

    if (!vendor?.trim() || !category?.trim() || !name?.trim()) {
      return res.status(400).json({ success: false, message: "Vendor, Category, and Name are required" });
    }

    const item = await Inventory.create({
      vendor:         String(vendor).trim(),
      category:       String(category).trim(),
      name:           String(name).trim(),
      unit:           String(unit || "Box").trim(),
      quantityNeeded: Number(quantityNeeded) || 1,
    });

    return res.status(201).json({ success: true, item });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Item already exists for this vendor and category",
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

    const { _id, __v, brand, regPrice, sizeText, stock, isActive, ...updateData } = req.body;

    if (updateData.vendor !== undefined) {
      updateData.vendor = String(updateData.vendor).trim();
    }
    if (updateData.category !== undefined) {
      updateData.category = String(updateData.category).trim();
    }
    if (updateData.name !== undefined) {
      updateData.name = String(updateData.name).trim();
    }
    if (updateData.unit !== undefined) {
      updateData.unit = String(updateData.unit || "Box").trim();
    }
    if (updateData.quantityNeeded !== undefined) {
      updateData.quantityNeeded = Number(updateData.quantityNeeded) || 1;
    }

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

    const item = await Inventory.findByIdAndDelete(id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    return res.json({ success: true, message: "Item deleted" });
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