import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import emailRouter from "./routes/emailRoute.js";
import inventoryRouter from "./routes/inventoryRoute.js";
import lookupRouter from "./routes/lookupRoute.js";
import authRouter from "./routes/authRoute.js";
import whatsappRouter from "./routes/whatsappRoute.js";
import reportRouter from "./routes/reportRoute.js";
import analyticsRouter from "./routes/analyticsRoute.js";
import { listInventory } from "./controllers/inventoryController.js";
import { optionalAuth } from "./middleware/auth.js";

dotenv.config();

const app = express();

// ─── Allowed Origins ────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = new Set([
  "https://kkstores.com",
  "https://www.kkstores.com",
  "https://api.kkstores.com",
  "http://localhost:5173",
  "http://localhost:5176",
  "http://localhost:5177",
  "http://localhost:3000",
]);

const isOriginAllowed = (origin) =>
  !origin ||
  ALLOWED_ORIGINS.has(origin) ||
  /^http:\/\/localhost:\d+$/.test(origin);

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, cb) =>
      isOriginAllowed(origin)
        ? cb(null, true)
        : cb(new Error(`CORS blocked for origin: ${origin}`)),
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "Accept",
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Cache-Control",
    ],
    credentials: true,
    optionsSuccessStatus: 204,
  })
);

// Handle preflight for all routes
app.options(/.*/, cors());

// ─── Body Parser ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));

// ─── Request Logger ──────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`📨 ${req.method} ${req.originalUrl}`);
  next();
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/inventory", inventoryRouter);
app.use("/api/lookups", lookupRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/auth", authRouter);
app.use("/api/whatsapp", whatsappRouter);
app.use("/api/reports", reportRouter);
app.use("/send-email", emailRouter);
app.use("/api/email",  emailRouter);
app.get("/api/products", optionalAuth, listInventory);

// ─── Health ──────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => res.send("API working"));
app.get("/health", (_req, res) =>
  res.json({ ok: true, time: new Date().toISOString() })
);

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("❌ Unhandled error:", err.message);
  res.status(err.status || 500).json({ success: false, message: err.message || "Server error" });
});

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;

const looksLikePlaceholderValue = (value) =>
  !value || /your_[a-z_]+_here|example\.com|<.*>|some_long_random_secret|StrongPassword123/i.test(value);

function warnIfPlaceholder(name, value) {
  if (looksLikePlaceholderValue(value)) {
    console.warn(`⚠️ ${name} looks missing or like a placeholder in .env. Update it before using the WhatsApp integration.`);
  }
}

async function start() {
  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI missing in .env");
    process.exit(1);
  }
  if (!process.env.JWT_SECRET) {
    console.error("❌ JWT_SECRET missing in .env");
    process.exit(1);
  }

  warnIfPlaceholder("WA_PHONE_NUMBER_ID", process.env.WA_PHONE_NUMBER_ID);
  warnIfPlaceholder("WA_TOKEN", process.env.WA_TOKEN);

  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ MongoDB connected");

    app.listen(PORT, "0.0.0.0", () =>
      console.log(`✅ Server running on http://0.0.0.0:${PORT}`)
    );
  } catch (err) {
    console.error("❌ Server start failed:", err.message);
    process.exit(1);
  }
}

start();