// routes/authRoute.js
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// POST /api/auth/login - Support both admin and user login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const inputEmail = (email || "").toLowerCase().trim();

    if (!inputEmail || !password) {
      return res.status(400).json({ success: false, message: "Email & password required" });
    }

    // Check if it's admin login (hardcoded credentials)
    const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    
    if (inputEmail === adminEmail) {
      const envPass = process.env.ADMIN_PASSWORD || "";
      const isHashed = envPass.startsWith("$2a$") || envPass.startsWith("$2b$");
      const ok = isHashed
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

    // Check if it's a regular user
    const user = await User.findOne({ email: inputEmail, isActive: true });
    
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);
    
    if (!ok) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { email: user.email, role: user.role, userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return res.json({ success: true, token, role: user.role });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/auth/register - Register new user (admin only)
router.post("/register", requireAdmin, async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body;
    const inputEmail = (email || "").toLowerCase().trim();

    if (!inputEmail || !password) {
      return res.status(400).json({ success: false, message: "Email & password required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: inputEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      email: inputEmail,
      password: hashedPassword,
      fullName: fullName || "",
      role: role || "user",
      isActive: true,
    });

    return res.json({ success: true, message: "User created successfully", user: { email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /api/auth/users - List all users (admin only)
router.get("/users", requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, "email fullName role isActive createdAt updatedAt").sort({ fullName: 1 });
    return res.json({ success: true, data: users });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE /api/auth/users/:id - Delete a user (admin only)
router.delete("/users/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({ success: true, message: "User deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;