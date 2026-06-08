import express from "express";
import Vendor from "../models/Vendor.js";
import Inventory from "../models/Inventory.js";

const router = express.Router();

const DEFAULT_VENDORS = [
  { name: "Costco",          email: "", phone: "", logo: "" },
  { name: "Mid East Market", email: "", phone: "", logo: "" },
  { name: "Spice Bazaar",    email: "", phone: "", logo: "" },
];

// ─── GET /api/vendors ─────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ name: 1 }).lean();

    // Auto-seed if collection is empty
    if (vendors.length === 0) {
      await Vendor.insertMany(DEFAULT_VENDORS, { ordered: false }).catch(() => {});
      const seeded = await Vendor.find().sort({ name: 1 }).lean();
      return res.json({ success: true, data: seeded });
    }

    res.json({ success: true, data: vendors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/vendors/seed ───────────────────────────────────────────────────
router.post("/seed", async (req, res) => {
  try {
    let added = 0;
    for (const v of DEFAULT_VENDORS) {
      const result = await Vendor.updateOne(
        { name: v.name },
        { $setOnInsert: v },
        { upsert: true }
      );
      if (result.upsertedCount) added++;
    }
    res.json({ success: true, message: `${added} vendor(s) seeded`, added });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/vendors ────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, whatsapp, logo } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Vendor name is required" });
    }
    const vendor = await Vendor.create({
      name:     name.trim(),
      email:    email?.trim()    || "",
      phone:    phone?.trim()    || "",
      whatsapp: whatsapp?.trim() || "",
      logo:     logo             || "",
    });
    res.json({ success: true, data: vendor });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: `Vendor "${req.body.name}" already exists` });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/vendors/:id ─────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const { name, email, phone, whatsapp, logo } = req.body;
    if (name !== undefined && !name?.trim()) {
      return res.status(400).json({ success: false, message: "Vendor name cannot be empty" });
    }

    const updates = {};
    if (name     !== undefined) updates.name     = name.trim();
    if (email    !== undefined) updates.email    = email?.trim()    || "";
    if (phone    !== undefined) updates.phone    = phone?.trim()    || "";
    if (whatsapp !== undefined) updates.whatsapp = whatsapp?.trim() || "";
    if (logo     !== undefined) updates.logo     = logo             || "";

    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });
    res.json({ success: true, data: vendor });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "Vendor name already taken" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/vendors/:id ──────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });

    const count = await Inventory.countDocuments({ vendor: vendor.name });
    if (count > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete "${vendor.name}" — ${count} product${count !== 1 ? "s are" : " is"} assigned to it. Reassign or remove them first.`,
      });
    }

    await Vendor.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
