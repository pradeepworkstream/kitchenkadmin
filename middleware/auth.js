// middleware/auth.js
import jwt from "jsonwebtoken";

/**
 * Shared token verifier — returns decoded payload or sends 401/403.
 */
function verifyToken(req, res) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ success: false, message: "No token provided" });
    return null;
  }

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
    return null;
  }
}

/** Allow any authenticated user (admin or user). */
export const requireAuth = (req, res, next) => {
  const decoded = verifyToken(req, res);
  if (!decoded) return;
  req.user = decoded;
  next();
};

/** Allow admin role only. */
export const requireAdmin = (req, res, next) => {
  const decoded = verifyToken(req, res);
  if (!decoded) return;

  if (decoded.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access required" });
  }

  req.user = decoded;
  next();
};