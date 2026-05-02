import express from "express";
import { sendWhatsAppText, sendReorder } from "../controllers/whatsappController.js";

const router = express.Router();

/**
 * POST /api/whatsapp/send-text
 */
router.post("/send-text", sendWhatsAppText);

/**
 * POST /api/whatsapp/send-reorder
 */
router.post("/send-reorder", sendReorder);

export default router;