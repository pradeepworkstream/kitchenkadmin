import express from "express";
import {
  listInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  updateInventoryStock,
} from "../controllers/inventoryController.js";

import { requireAdmin, requireAuth } from "../middleware/auth.js";

const inventoryRouter = express.Router();

// Public read
inventoryRouter.get("/list", listInventory);

// User can update stock
inventoryRouter.put("/:id/stock", requireAuth, updateInventoryStock);

// Admin protected
inventoryRouter.post("/", requireAdmin, createInventoryItem);
inventoryRouter.put("/:id", requireAdmin, updateInventoryItem);
inventoryRouter.delete("/:id", requireAdmin, deleteInventoryItem);

export default inventoryRouter;