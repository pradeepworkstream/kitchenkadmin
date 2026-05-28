// routes/authRoute.js
import express from "express";
import jwt     from "jsonwebtoken";
import bcrypt  from "bcryptjs";
import User    from "../models/User.js";
import { requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const inputEmail = String(email || "").toLowerCase().trim();

    if (!inputEmail || !password) {
      return res.status(400).json({ success: false, message: "Email & password required" });
    }

    // ── Admin (hardcoded in .env) ───────────────────────────────────────────
    const adminEmail = String(process.env.ADMIN_EMAIL || "").toLowerCase().trim();

    if (inputEmail === adminEmail) {
      const envPass  = process.env.ADMIN_PASSWORD || "";
      const isHashed = envPass.startsWith("$2a$") || envPass.startsWith("$2b$");
      const ok       = isHashed
        ? await bcrypt.compare(password, envPass)
        : password === envPass;

      if (!ok) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { email: adminEmail, role: "admin" },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
      );

      return res.json({ success: true, token, role: "admin" });
    }

    // ── Regular user ────────────────────────────────────────────────────────
    const user = await User.findOne({ email: inputEmail, isActive: true }).select("+password");

    // Use constant-time comparison even when user not found to prevent user-enumeration
    const dummyHash  = "$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345";
    const ok = user
      ? await bcrypt.compare(password, user.password)
      : (await bcrypt.compare(password, dummyHash), false);

    if (!user || !ok) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { email: user.email, role: user.role, userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return res.json({ success: true, token, role: user.role });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── POST /api/auth/register (admin only) ────────────────────────────────────
router.post("/register", requireAdmin, async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body || {};
    const inputEmail = String(email || "").toLowerCase().trim();

    if (!inputEmail || !password) {
      return res.status(400).json({ success: false, message: "Email & password required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }

    const existing = await User.findOne({ email: inputEmail });
    if (existing) {
      return res.status(409).json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12); // cost 12 is safer than 10

    const user = await User.create({
      email:    inputEmail,
      password: hashedPassword,
      fullName: fullName || "",
      role:     role === "admin" ? "admin" : "user", // whitelist roles
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      user: { email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── GET /api/auth/users (admin only) ────────────────────────────────────────
router.get("/users", requireAdmin, async (req, res) => {
  try {
    const users = await User
      .find({}, "email fullName role isActive createdAt updatedAt")
      .sort({ fullName: 1 })
      .lean();
    return res.json({ success: true, data: users });
  } catch (err) {
    console.error("List users error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── DELETE /api/auth/users/:id (admin only) ─────────────────────────────────
router.delete("/users/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.json({ success: true, message: "User deleted" });
  } catch (err) {
    console.error("Delete user error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;