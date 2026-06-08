import express from "express";
import { sendEmail, sendInventoryAttachmentEmail, sendReorderEmail } from "../controllers/emailController.js";

const router = express.Router();

// POST /send-email  (legacy)
router.post("/", sendEmail);

// POST /api/email/send  (cart sidebar purchase-order email)
router.post("/send", sendEmail);

// POST /send-email/inventory-attachment
router.post("/inventory-attachment", sendInventoryAttachmentEmail);

// POST /send-email/reorder
router.post("/reorder", sendReorderEmail);

export default router;