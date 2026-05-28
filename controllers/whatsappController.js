// controllers/whatsappController.js
import axios from "axios";

const cleanPhone = (v) => String(v || "").replace(/\D/g, ""); // digits only

// ─── Shared WA sender ────────────────────────────────────────────────────────
async function sendWAText(toPhone, text) {
  const { WA_PHONE_NUMBER_ID, WA_TOKEN, WA_API_VERSION = "v20.0" } = process.env;

  if (!WA_PHONE_NUMBER_ID || !WA_TOKEN) {
    throw Object.assign(
      new Error("WA_PHONE_NUMBER_ID / WA_TOKEN missing in .env"),
      { status: 500 }
    );
  }

  const url = `https://graph.facebook.com/${WA_API_VERSION}/${WA_PHONE_NUMBER_ID}/messages`;

  const { data } = await axios.post(
    url,
    {
      messaging_product: "whatsapp",
      to:   toPhone,
      type: "text",
      text: { body: text },
    },
    {
      headers: {
        Authorization: `Bearer ${WA_TOKEN}`,
        "Content-Type": "application/json",
      },
      timeout: 15_000,
    }
  );

  return data;
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/whatsapp/send-text
 */
export const sendWhatsAppText = async (req, res) => {
  try {
    const toPhone = cleanPhone(req.body?.toPhone);
    const text    = String(req.body?.text || "").trim();

    if (!toPhone) return res.status(400).json({ success: false, message: "toPhone is required" });
    if (!text)    return res.status(400).json({ success: false, message: "text is required" });

    const data = await sendWAText(toPhone, text);
    return res.json({ success: true, data });
  } catch (err) {
    const metaError = err?.response?.data?.error;
    console.error("sendWhatsAppText error:", metaError || err.message);

    return res.status(err?.response?.status || err.status || 500).json({
      success: false,
      message: metaError?.message || err.message || "WhatsApp send failed",
      ...(metaError && {
        meta: {
          type:           metaError.type,
          code:           metaError.code,
          error_subcode:  metaError.error_subcode,
          fbtrace_id:     metaError.fbtrace_id,
        },
      }),
    });
  }
};

/**
 * POST /api/whatsapp/send-reorder
 */
export const sendReorder = async (req, res) => {
  try {
    const toPhone = cleanPhone(req.body?.toPhone);
    const text    = String(req.body?.text || "").trim();

    if (!toPhone) return res.status(400).json({ success: false, message: "toPhone is required" });
    if (!text)    return res.status(400).json({ success: false, message: "text is required" });

    const data = await sendWAText(toPhone, text);
    return res.json({ success: true, data });
  } catch (err) {
    const metaError = err?.response?.data?.error;
    console.error("sendReorder error:", metaError || err.message);

    return res.status(err?.response?.status || err.status || 500).json({
      success: false,
      message: metaError?.message || err.message || "Reorder send failed",
      ...(metaError && {
        meta: {
          type:           metaError.type,
          code:           metaError.code,
          error_subcode:  metaError.error_subcode,
          fbtrace_id:     metaError.fbtrace_id,
        },
      }),
    });
  }
};