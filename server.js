import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import emailRouter from "./routes/emailRoute.js";
import inventoryRouter from "./routes/inventoryRoute.js";
import authRouter from "./routes/authRoute.js";
import whatsappRouter from "./routes/whatsappRoute.js";
import reportRouter from "./routes/reportRoute.js";
import { listInventory } from "./controllers/inventoryController.js";

dotenv.config();

const app = express();

// Allowed frontend domains
const allowedOrigins = [
  "https://kkstores.com",
  "https://www.kkstores.com",
  "https://api.kkstores.com",
  "http://localhost:5173",
  "http://localhost:5176",
  "http://localhost:5177",
  "http://localhost:3000",
];

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // allow Postman / mobile apps / curl
    if (!origin) {
      return callback(null, true);
    }

    // allow listed domains
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // allow localhost during development
    if (origin && origin.startsWith("http://localhost:")) {
      return callback(null, true);
    }

    console.log("❌ Blocked by CORS:", origin);

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },

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
  preflightContinue: false,
};

// Middlewares
app.use(cors(corsOptions));
// app.options("*", cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes(origin) || origin.startsWith("http://localhost:"))) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin,Accept,Content-Type,Authorization,X-Requested-With,Cache-Control"
    );
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json({ limit: "10mb" }));

// Request logger
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.originalUrl}`);
  next();
});

// Routes
console.log("📋 Setting up routes...");

app.use("/api/inventory", inventoryRouter);
app.use("/api/auth", authRouter);
app.use("/api/whatsapp", whatsappRouter);
app.use("/api/reports", reportRouter);
app.use("/send-email", emailRouter);

// Products API
app.get("/api/products", listInventory);

console.log("✅ Routes configured");

// Health routes
app.get("/", (req, res) => {
  res.send("API working");
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    time: new Date().toISOString(),
  });
});

// Server port
const PORT = process.env.PORT || 5001;

// Start server
async function start() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI missing in .env");
    }

    console.log("🔌 Connecting to MongoDB...");

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log("✅ MongoDB connected");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
    });

  } catch (err) {
    console.error("❌ Server start failed:", err.message);
    process.exit(1);
  }
}

start();