import express from "express";
import { collectEvent, generateReport } from "../controllers/analyticsController.js";

const router = express.Router();

router.post("/event", collectEvent);
router.get("/report", generateReport);

export default router;
