import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

// ---------- helpers ----------
const normalizeList = (v) =>
  String(v || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .join(", ");

function getMailer() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP config missing in server .env");
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,      // 587 = STARTTLS
    requireTLS: true,   // ✅ force TLS
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
  });
}

// ✅ build PDF buffer
async function buildPdfBuffer({ items = [], note = "" }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks = [];

      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      doc.fontSize(18).text("KitchenK Store-room Inventory", { align: "center" });
      doc.moveDown();

      if (note) {
        doc.fontSize(12).text(`Note: ${note}`);
        doc.moveDown();
      }

      const sorted = [...items].sort((a, b) =>
        a.category === b.category
          ? String(a.name || "").localeCompare(String(b.name || ""))
          : String(a.category || "").localeCompare(String(b.category || ""))
      );

      let i = 1;
      let lastCat = null;

      for (const it of sorted) {
        if (it.category !== lastCat) {
          lastCat = it.category;
          doc.moveDown(0.5);
          doc.fontSize(13).text(String(lastCat || "").toUpperCase(), { underline: true });
          doc.moveDown(0.2);
          doc.fontSize(12);
        }

        const brand = it.selectedBrand || "";
        const qty = `${it.qtyNumber || ""} ${it.unit || ""}`.trim();
        doc.text(`${i}. ${it.name || ""}  |  ${brand}  |  ${qty}`);
        i++;
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

// ✅ build Excel buffer
async function buildExcelBuffer({ items = [], note = "" }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Inventory");

  ws.addRow(["KitchenK Store-room Inventory"]);
  ws.addRow([]);
  if (note) ws.addRow([`Note: ${note}`]);
  ws.addRow([]);

  const headerRow = ws.addRow(["Category", "Product", "Brand", "Qty"]);
  headerRow.font = { bold: true };

  const sorted = [...items].sort((a, b) =>
    a.category === b.category
      ? String(a.name || "").localeCompare(String(b.name || ""))
      : String(a.category || "").localeCompare(String(b.category || ""))
  );

  for (const it of sorted) {
    ws.addRow([
      it.category || "",
      it.name || "",
      it.selectedBrand || "",
      `${it.qtyNumber || ""} ${it.unit || ""}`.trim(),
    ]);
  }

  ws.columns = [
    { width: 18 },
    { width: 28 },
    { width: 22 },
    { width: 14 },
  ];

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// =====================================================
// 1) Your existing HTML email endpoint (kept + improved)
// =====================================================
export const sendEmail = async (req, res) => {
  try {
    const { to, cc, subject, message } = req.body || {};

    const toList = normalizeList(to);
    const ccList = normalizeList(cc);

    if (!toList) {
      return res.status(400).json({ success: false, message: "Recipient email required." });
    }

    const transporter = getMailer();

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: toList,
      cc: ccList || undefined,
      subject: subject || "KitchenK Inventory",
      html: message || "<p></p>",
    });

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};

// =====================================================
// 2) NEW: send PDF/Excel as attachment
//    POST /send-email/inventory-attachment
// =====================================================
export const sendInventoryAttachmentEmail = async (req, res) => {
  try {
    const { to, cc, subject, note, format, items } = req.body || {};

    const toList = normalizeList(to);
    const ccList = normalizeList(cc);

    if (!toList) {
      return res.status(400).json({ success: false, message: "To email required" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Select at least one item" });
    }

    const safeFormat = String(format || "").toLowerCase();
    if (!["pdf", "excel"].includes(safeFormat)) {
      return res.status(400).json({ success: false, message: "Format must be pdf or excel" });
    }

    let fileBuffer;
    let filename;
    let contentType;

    if (safeFormat === "pdf") {
      fileBuffer = await buildPdfBuffer({ items, note: note || "" });
      filename = "kitchenk-inventory.pdf";
      contentType = "application/pdf";
    } else {
      fileBuffer = await buildExcelBuffer({ items, note: note || "" });
      filename = "kitchenk-inventory.xlsx";
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }

    const transporter = getMailer();

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
        <p>Hi,</p>
        <p>Please find the attached store-room inventory file.</p>
        ${note ? `<p><b>Note:</b> ${note}</p>` : ""}
        <p style="color:#6b7280;">– KitchenK Admin</p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: toList,
      cc: ccList || undefined,
      subject: subject || "KitchenK Store-room Inventory",
      html,
      attachments: [
        {
          filename,
          content: fileBuffer,
          contentType,
        },
      ],
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("sendInventoryAttachmentEmail error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};

export const sendReorderEmail = async (req, res) => {
  try {
    const { text, toEmail, subject, fromEmail } = req.body;
    console.log('Email sendReorderEmail called:', { toEmail, subject, fromEmail, text: text?.substring(0, 100) + '...' });

    if (!toEmail) return res.status(400).json({ success: false, message: "toEmail is required" });
    if (!text) return res.status(400).json({ success: false, message: "text is required" });
    if (!subject) return res.status(400).json({ success: false, message: "subject is required" });
    if (!fromEmail) return res.status(400).json({ success: false, message: "fromEmail is required" });

    const transporter = getMailer();

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
        <p>Hi Vendor,</p>
        <p>Please find the reorder request below:</p>
        <pre style="background:#f3f4f6;padding:12px;border-radius:4px;white-space:pre-wrap;">${text}</pre>
        <p>Please deliver as soon as possible.</p>
        <p style="color:#6b7280;">– KitchenK Admin</p>
      </div>
    `;

    await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      subject: subject,
      html,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("sendReorderEmail error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};