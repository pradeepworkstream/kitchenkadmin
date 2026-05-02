import axios from "axios";

const cleanPhone = (v) => String(v || "").replace(/[^\d]/g, ""); // digits only

export const sendWhatsAppText = async (req, res) => {
  try {
    const toPhone = cleanPhone(req.body?.toPhone);
    const text = String(req.body?.text || "").trim();

    if (!toPhone) return res.status(400).json({ success: false, message: "toPhone is required" });
    if (!text) return res.status(400).json({ success: false, message: "text is required" });

    const phoneNumberId = process.env.WA_PHONE_NUMBER_ID;
    const token = process.env.WA_TOKEN;
    const apiVersion = process.env.WA_API_VERSION || "v20.0";

    if (!phoneNumberId || !token) {
      return res.status(500).json({
        success: false,
        message: "WA_PHONE_NUMBER_ID / WA_TOKEN missing in .env",
      });
    }

    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to: toPhone,
      type: "text",
      text: { body: text },
    };

    const resp = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });

    return res.json({ success: true, data: resp.data });
  } catch (err) {
    // ✅ Better error output
    const metaError = err?.response?.data?.error;
    console.error("WA error:", metaError || err.message);

    return res.status(err?.response?.status || 500).json({
      success: false,
      message: metaError?.message || "WhatsApp send failed",
      meta: metaError
        ? {
            type: metaError.type,
            code: metaError.code,
            error_subcode: metaError.error_subcode,
            fbtrace_id: metaError.fbtrace_id,
          }
        : undefined,
    });
  }
};

export const sendReorder = async (req, res) => {
  try {
    const { text, toPhone } = req.body;
    console.log('WhatsApp sendReorder called:', { text: text?.substring(0, 100) + '...', toPhone });

    if (!toPhone) return res.status(400).json({ success: false, message: "toPhone is required" });
    const vendorPhone = cleanPhone(toPhone);
    const messageText = String(text || "").trim();

    if (!messageText) return res.status(400).json({ success: false, message: "text is required" });

    const phoneNumberId = process.env.WA_PHONE_NUMBER_ID;
    const token = process.env.WA_TOKEN;
    const apiVersion = process.env.WA_API_VERSION || "v20.0";

    if (!phoneNumberId || !token) {
      return res.status(500).json({
        success: false,
        message: "WA_PHONE_NUMBER_ID / WA_TOKEN missing in .env",
      });
    }

    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to: vendorPhone,
      type: "text",
      text: { body: messageText },
    };

    const resp = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });

    return res.json({ success: true, data: resp.data });
  } catch (err) {
    const metaError = err?.response?.data?.error;
    console.error("Reorder WA error:", metaError || err.message);

    return res.status(err?.response?.status || 500).json({
      success: false,
      message: metaError?.message || "Reorder send failed",
      meta: metaError
        ? {
            type: metaError.type,
            code: metaError.code,
            error_subcode: metaError.error_subcode,
            fbtrace_id: metaError.fbtrace_id,
          }
        : undefined,
    });
  }
};