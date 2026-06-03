import fs from "fs";
import path from "path";
import AnalyticsEvent from "../models/AnalyticsEvent.js";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const ANALYTICS_FILE = path.resolve(__dirname, "../data/analytics.jsonl");

export const collectEvent = async (req, res) => {
  try {
    const evt = req.body || {};
    evt.receivedAt = new Date().toISOString();
    const line = JSON.stringify(evt) + "\n";
    await fs.promises.appendFile(ANALYTICS_FILE, line, { encoding: "utf8" });
    // also persist to MongoDB (best-effort)
    try {
      const doc = {
        event: evt.event || "unknown",
        variant: evt.variant || evt.v || "unknown",
        page: evt.page,
        itemId: evt.itemId || evt.id,
        vendor: evt.vendor,
        category: evt.category,
        method: evt.method,
        count: evt.count,
        meta: evt,
        receivedAt: evt.receivedAt ? new Date(evt.receivedAt) : new Date(),
      };
      await AnalyticsEvent.create(doc);
    } catch (dbErr) {
      console.warn("Analytics DB save failed:", dbErr?.message || dbErr);
    }

    console.log("Analytics event:", evt.event, evt);
    return res.json({ success: true });
  } catch (err) {
    console.error("collectEvent error:", err);
    return res.status(500).json({ success: false, message: "Failed to collect event" });
  }
};

export const generateReport = async (_req, res) => {
  try {
    // Prefer aggregating from MongoDB if available
    try {
      const agg = await AnalyticsEvent.aggregate([
        { $match: {} },
        { $group: { _id: { variant: "$variant", event: "$event" }, count: { $sum: 1 } } },
      ]).allowDiskUse(true);

      const stats = {};
      for (const r of agg) {
        const variant = (r._id.variant) || "unknown";
        const event = (r._id.event) || "unknown";
        stats[variant] = stats[variant] || { page_view: 0, add_to_cart: 0, checkout: 0, raw: {} };
        stats[variant].raw[event] = (stats[variant].raw[event] || 0) + r.count;
        if (event === "page_view") stats[variant].page_view += r.count;
        else if (event === "add_to_cart") stats[variant].add_to_cart += r.count;
        else if (event === "checkout") stats[variant].checkout += r.count;
      }

      const report = {};
      for (const [variant, vstats] of Object.entries(stats)) {
        const views = vstats.page_view || 0;
        const adds = vstats.add_to_cart || 0;
        const checks = vstats.checkout || 0;
        report[variant] = {
          page_view: views,
          add_to_cart: adds,
          checkout: checks,
          add_rate: views ? +(adds / views).toFixed(4) : 0,
          checkout_rate: adds ? +(checks / adds).toFixed(4) : 0,
          raw: vstats.raw,
        };
      }

      return res.json({ success: true, data: report });
    } catch (dbErr) {
      console.warn("Analytics DB aggregation failed, falling back to file:", dbErr?.message || dbErr);
      // fall through to file-based report
    }

    const data = await fs.promises.readFile(ANALYTICS_FILE, { encoding: "utf8" });
    const lines = data.split(/\n/).map((l) => l.trim()).filter(Boolean);

    const stats = {};
    for (const line of lines) {
      let obj;
      try { obj = JSON.parse(line); } catch { continue; }
      const variant = obj.variant || obj.v || "unknown";
      const event = obj.event || "unknown";
      stats[variant] = stats[variant] || { page_view: 0, add_to_cart: 0, checkout: 0, raw: {} };
      stats[variant].raw[event] = (stats[variant].raw[event] || 0) + 1;
      if (event === "page_view") stats[variant].page_view++;
      else if (event === "add_to_cart") stats[variant].add_to_cart++;
      else if (event === "checkout") stats[variant].checkout++;
    }

    // compute rates
    const report = {};
    for (const [variant, vstats] of Object.entries(stats)) {
      const views = vstats.page_view || 0;
      const adds = vstats.add_to_cart || 0;
      const checks = vstats.checkout || 0;
      report[variant] = {
        page_view: views,
        add_to_cart: adds,
        checkout: checks,
        add_rate: views ? +(adds / views).toFixed(4) : 0,
        checkout_rate: adds ? +(checks / adds).toFixed(4) : 0,
        raw: vstats.raw,
      };
    }

    return res.json({ success: true, data: report });
  } catch (err) {
    console.error("generateReport error:", err);
    return res.status(500).json({ success: false, message: "Failed to generate report" });
  }
};
