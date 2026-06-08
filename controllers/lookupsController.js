import Vendor from "../models/Vendor.js";
import Category from "../models/Category.js";
import Unit from "../models/Unit.js";
import QuantityOption from "../models/QuantityOption.js";

const handleDbError = (err, res, message) => {
  if (err?.code === 11000) {
    return res.status(409).json({ success: false, message });
  }
  console.error("lookupController error:", err);
  return res.status(500).json({ success: false, message: err?.message || "Server error" });
};

export const listVendors = async (_req, res) => {
  try {
    const vendors = await Vendor.find({}).sort({ name: 1 }).lean();
    return res.json({ success: true, data: vendors });
  } catch (err) {
    return handleDbError(err, res, "Unable to load vendors");
  }
};

export const createVendor = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ success: false, message: "Vendor name is required" });
    }
    const item = await Vendor.create({ name });
    return res.status(201).json({ success: true, item });
  } catch (err) {
    return handleDbError(err, res, "Vendor already exists");
  }
};

export const updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const name = String(req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ success: false, message: "Vendor name is required" });
    }
    const item = await Vendor.findByIdAndUpdate(id, { name }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: "Vendor not found" });
    return res.json({ success: true, item });
  } catch (err) {
    return handleDbError(err, res, "Unable to update vendor");
  }
};

export const deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Vendor.findByIdAndDelete(id);
    if (!item) return res.status(404).json({ success: false, message: "Vendor not found" });
    return res.json({ success: true });
  } catch (err) {
    return handleDbError(err, res, "Unable to delete vendor");
  }
};

export const listCategories = async (req, res) => {
  try {
    const vendor = String(req.query.vendor || "").trim();
    const query = {};
    if (vendor) query.vendor = vendor;
    const categories = await Category.find(query).sort({ vendor: 1, name: 1 }).lean();
    return res.json({ success: true, data: categories });
  } catch (err) {
    return handleDbError(err, res, "Unable to load categories");
  }
};

export const createCategory = async (req, res) => {
  try {
    const vendor = String(req.body.vendor || "").trim();
    const name = String(req.body.name || "").trim();
    if (!vendor) return res.status(400).json({ success: false, message: "Vendor is required" });
    if (!name) return res.status(400).json({ success: false, message: "Category name is required" });
    const item = await Category.create({ vendor, name });
    return res.status(201).json({ success: true, item });
  } catch (err) {
    return handleDbError(err, res, "Category already exists for this vendor");
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = String(req.body.vendor || "").trim();
    const name = String(req.body.name || "").trim();
    if (!vendor) return res.status(400).json({ success: false, message: "Vendor is required" });
    if (!name) return res.status(400).json({ success: false, message: "Category name is required" });
    const item = await Category.findByIdAndUpdate(id, { vendor, name }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: "Category not found" });
    return res.json({ success: true, item });
  } catch (err) {
    return handleDbError(err, res, "Unable to update category");
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Category.findByIdAndDelete(id);
    if (!item) return res.status(404).json({ success: false, message: "Category not found" });
    return res.json({ success: true });
  } catch (err) {
    return handleDbError(err, res, "Unable to delete category");
  }
};

export const listUnits = async (_req, res) => {
  try {
    const units = await Unit.find({}).sort({ name: 1 }).lean();
    return res.json({ success: true, data: units });
  } catch (err) {
    return handleDbError(err, res, "Unable to load units");
  }
};

export const createUnit = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ success: false, message: "Unit name is required" });
    const item = await Unit.create({ name });
    return res.status(201).json({ success: true, item });
  } catch (err) {
    return handleDbError(err, res, "Unit already exists");
  }
};

export const updateUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ success: false, message: "Unit name is required" });
    const item = await Unit.findByIdAndUpdate(id, { name }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: "Unit not found" });
    return res.json({ success: true, item });
  } catch (err) {
    return handleDbError(err, res, "Unable to update unit");
  }
};

export const deleteUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Unit.findByIdAndDelete(id);
    if (!item) return res.status(404).json({ success: false, message: "Unit not found" });
    return res.json({ success: true });
  } catch (err) {
    return handleDbError(err, res, "Unable to delete unit");
  }
};

export const listQuantities = async (_req, res) => {
  try {
    const quantities = await QuantityOption.find({}).sort({ value: 1 }).lean();
    return res.json({ success: true, data: quantities });
  } catch (err) {
    return handleDbError(err, res, "Unable to load quantities");
  }
};

export const createQuantity = async (req, res) => {
  try {
    const value = Number(req.body.value);
    if (!Number.isInteger(value) || value <= 0) {
      return res.status(400).json({ success: false, message: "Quantity must be a positive integer" });
    }
    const item = await QuantityOption.create({ value });
    return res.status(201).json({ success: true, item });
  } catch (err) {
    return handleDbError(err, res, "Quantity already exists");
  }
};

export const updateQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const value = Number(req.body.value);
    if (!Number.isInteger(value) || value <= 0) {
      return res.status(400).json({ success: false, message: "Quantity must be a positive integer" });
    }
    const item = await QuantityOption.findByIdAndUpdate(id, { value }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: "Quantity not found" });
    return res.json({ success: true, item });
  } catch (err) {
    return handleDbError(err, res, "Unable to update quantity");
  }
};

export const deleteQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await QuantityOption.findByIdAndDelete(id);
    if (!item) return res.status(404).json({ success: false, message: "Quantity not found" });
    return res.json({ success: true });
  } catch (err) {
    return handleDbError(err, res, "Unable to delete quantity");
  }
};
