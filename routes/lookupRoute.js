import express from "express";
import {
  listVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listUnits,
  createUnit,
  updateUnit,
  deleteUnit,
  listQuantities,
  createQuantity,
  updateQuantity,
  deleteQuantity,
} from "../controllers/lookupsController.js";
import { requireAdmin } from "../middleware/auth.js";

const lookupRouter = express.Router();

// Vendors
lookupRouter.get("/vendors", listVendors);
lookupRouter.post("/vendors", requireAdmin, createVendor);
lookupRouter.put("/vendors/:id", requireAdmin, updateVendor);
lookupRouter.delete("/vendors/:id", requireAdmin, deleteVendor);

// Categories
lookupRouter.get("/categories", listCategories);
lookupRouter.post("/categories", requireAdmin, createCategory);
lookupRouter.put("/categories/:id", requireAdmin, updateCategory);
lookupRouter.delete("/categories/:id", requireAdmin, deleteCategory);

// Units
lookupRouter.get("/units", listUnits);
lookupRouter.post("/units", requireAdmin, createUnit);
lookupRouter.put("/units/:id", requireAdmin, updateUnit);
lookupRouter.delete("/units/:id", requireAdmin, deleteUnit);

// Quantity values
lookupRouter.get("/quantities", listQuantities);
lookupRouter.post("/quantities", requireAdmin, createQuantity);
lookupRouter.put("/quantities/:id", requireAdmin, updateQuantity);
lookupRouter.delete("/quantities/:id", requireAdmin, deleteQuantity);

export default lookupRouter;
