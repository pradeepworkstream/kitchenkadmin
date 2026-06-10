import express from "express";
import {
  listInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from "../controllers/inventoryController.js";

import { requireAdmin, optionalAuth } from "../middleware/auth.js";

const inventoryRouter = express.Router();

// Public read (defaultPrice stripped for non-admins)
inventoryRouter.get("/list", optionalAuth, listInventory);

// Admin protected
inventoryRouter.post("/", requireAdmin, createInventoryItem);
inventoryRouter.put("/:id", requireAdmin, updateInventoryItem);
inventoryRouter.delete("/:id", requireAdmin, deleteInventoryItem);

export default inventoryRouter;