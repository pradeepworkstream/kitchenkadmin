import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const PORT = process.env.PORT || 5002;
const BASE = `http://localhost:${PORT}`;

async function run() {
  try {
    console.log("Logging in as admin...");
    const loginRes = await axios.post(`${BASE}/api/auth/login`, {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    });

    if (!loginRes.data?.success) {
      console.error("Login failed:", loginRes.data);
      process.exit(1);
    }

    const token = loginRes.data.token;
    console.log("Logged in, token obtained (len=", token?.length || 0, ")");

    const name = `AutoTest Item ${Date.now()}`;
    const payload = {
      vendor: "Costco",
      category: "Beverages",
      name,
      stock: 5,
    };

    console.log("Creating item:", payload);
    const createRes = await axios.post(`${BASE}/api/inventory`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!createRes.data?.success) {
      console.error("Create failed:", createRes.data);
      process.exit(1);
    }

    const created = createRes.data.item;
    console.log("Created item id:", created._id);

    console.log("Verifying via list API...");
    const listRes = await axios.get(`${BASE}/api/inventory/list`, {
      params: { vendor: payload.vendor, category: payload.category, search: name },
    });

    const found = (listRes.data?.data || []).find((i) => i.name === name);
    if (found) {
      console.log("Verification success — item found:", found._id);
      console.log(JSON.stringify(found, null, 2));
      process.exit(0);
    } else {
      console.error("Verification failed — item not found in list response");
      console.error(JSON.stringify(listRes.data, null, 2));
      process.exit(1);
    }
  } catch (err) {
    console.error("Test script error:", err?.response?.data || err.message || err);
    process.exit(1);
  }
}

run();
