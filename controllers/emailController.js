// controllers/emailController.js
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const normalizeList = (v) =>
  String(v || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .join(", ");

/** Sort items by category then name */
const sortItems = (items) =>
  [...items].sort((a, b) => {
    const catCmp = String(a.category || "").localeCompare(String(b.category || ""));
    return catCmp !== 0 ? catCmp : String(a.name || "").localeCompare(String(b.name || ""));
  });

function getMailer() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP config missing in server .env (SMTP_HOST, SMTP_USER, SMTP_PASS)");
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    requireTLS: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 20_000,
    greetingTimeout:   20_000,
    socketTimeout:     30_000,
  });
}

// ─── Document Builders ───────────────────────────────────────────────────────

async function buildPdfBuffer({ items = [], note = "" }) {
  return new Promise((resolve, reject) => {
    try {
      const doc    = new PDFDocument({ size: "A4", margin: 40 });
      const chunks = [];

      doc.on("data", (c) => chunks.push(c));
      doc.on("end",  () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(18).text("KitchenK Store-room Inventory", { align: "center" });
      doc.moveDown();

      if (note) {
        doc.fontSize(12).text(`Note: ${note}`);
        doc.moveDown();
      }

      let i = 1;
      let lastCat = null;

      for (const it of sortItems(items)) {
        if (it.category !== lastCat) {
          lastCat = it.category;
          doc.moveDown(0.5);
          doc.fontSize(13).text(String(lastCat || "").toUpperCase(), { underline: true });
          doc.moveDown(0.2);
          doc.fontSize(12);
        }

        const brand = it.selectedBrand || "";
        const qty   = `${it.qtyNumber || ""} ${it.unit || ""}`.trim();
        const parts = [it.name || "", brand, qty].filter(Boolean).join("  |  ");
        doc.text(`${i}. ${parts}`);
        i++;
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

async function buildExcelBuffer({ items = [], note = "" }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Inventory");

  ws.addRow(["KitchenK Store-room Inventory"]);
  ws.addRow([]);
  if (note) ws.addRow([`Note: ${note}`]);
  ws.addRow([]);

  const headerRow = ws.addRow(["Category", "Product", "Brand", "Qty"]);
  headerRow.font = { bold: true };

  for (const it of sortItems(items)) {
    ws.addRow([
      it.category     || "",
      it.name         || "",
      it.selectedBrand || "",
      `${it.qtyNumber || ""} ${it.unit || ""}`.trim(),
    ]);
  }

  ws.columns = [{ width: 18 }, { width: 28 }, { width: 22 }, { width: 14 }];

  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /send-email
 * Plain HTML email (existing behaviour, unchanged)
 */
export const sendEmail = async (req, res) => {
  try {
    const { to, cc, subject, message } = req.body || {};
    const toList = normalizeList(to);
    const ccList = normalizeList(cc);

    if (!toList) {
      return res.status(400).json({ success: false, message: "Recipient email required" });
    }

    await getMailer().sendMail({
      from:    process.env.SMTP_FROM || process.env.SMTP_USER,
      to:      toList,
      cc:      ccList || undefined,
      subject: subject || "KitchenK Inventory",
      html:    message || "<p></p>",
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("sendEmail error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};

/**
 * POST /send-email/inventory-attachment
 * Sends PDF or Excel inventory as email attachment
 */
export const sendInventoryAttachmentEmail = async (req, res) => {
  try {
    const { to, cc, subject, note, format, items } = req.body || {};

    const toList    = normalizeList(to);
    const ccList    = normalizeList(cc);
    const safeFormat = String(format || "").toLowerCase();

    if (!toList) {
      return res.status(400).json({ success: false, message: "To email required" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Select at least one item" });
    }
    if (!["pdf", "excel"].includes(safeFormat)) {
      return res.status(400).json({ success: false, message: "Format must be pdf or excel" });
    }

    const isPdf = safeFormat === "pdf";
    const fileBuffer  = isPdf
      ? await buildPdfBuffer({ items, note: note || "" })
      : await buildExcelBuffer({ items, note: note || "" });
    const filename    = isPdf ? "kitchenk-inventory.pdf" : "kitchenk-inventory.xlsx";
    const contentType = isPdf
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
        <p>Hi,</p>
        <p>Please find the attached store-room inventory file.</p>
        ${note ? `<p><b>Note:</b> ${note}</p>` : ""}
        <p style="color:#6b7280;">– KitchenK Admin</p>
      </div>`;

    await getMailer().sendMail({
      from:        process.env.SMTP_FROM || process.env.SMTP_USER,
      to:          toList,
      cc:          ccList || undefined,
      subject:     subject || "KitchenK Store-room Inventory",
      html,
      attachments: [{ filename, content: fileBuffer, contentType }],
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("sendInventoryAttachmentEmail error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};

/**
 * POST /send-email/reorder
 * Sends a reorder request email to a vendor
 */
export const sendReorderEmail = async (req, res) => {
  try {
    const { text, toEmail, subject, fromEmail } = req.body || {};

    if (!toEmail)   return res.status(400).json({ success: false, message: "toEmail is required" });
    if (!text)      return res.status(400).json({ success: false, message: "text is required" });
    if (!subject)   return res.status(400).json({ success: false, message: "subject is required" });
    if (!fromEmail) return res.status(400).json({ success: false, message: "fromEmail is required" });

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
        <p>Hi Vendor,</p>
        <p>Please find the reorder request below:</p>
        <pre style="background:#f3f4f6;padding:12px;border-radius:4px;white-space:pre-wrap;">${text}</pre>
        <p>Please deliver as soon as possible.</p>
        <p style="color:#6b7280;">– KitchenK Admin</p>
      </div>`;

    await getMailer().sendMail({ from: fromEmail, to: toEmail, subject, html });

    return res.json({ success: true });
  } catch (err) {
    console.error("sendReorderEmail error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};