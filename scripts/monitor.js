import dotenv from 'dotenv';
import axios from 'axios';
import nodemailer from 'nodemailer';

dotenv.config();

const MONITOR_URL = process.env.MONITOR_URL || 'https://kkstores.com';
const INTERVAL_MINUTES = Number(process.env.MONITOR_INTERVAL_MINUTES) || 5;
const CHECK_INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;
const FAILURE_THRESHOLD = Number(process.env.MONITOR_FAILURE_THRESHOLD) || 3;

const ALERT_TO = process.env.ALERT_EMAIL_TO || process.env.ADMIN_EMAIL || process.env.VENDOR_EMAIL;
const ALERT_FROM = process.env.SMTP_FROM || process.env.SMTP_USER;

let failureCount = 0;
let lastStateUp = null; // null = unknown, true = up, false = down

function createTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP not fully configured in environment — emails will not be sent.');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendAlert(subject, text) {
  const transporter = createTransporter();
  const now = new Date().toISOString();
  const body = `${text}\n\nTime: ${now}\nChecked URL: ${MONITOR_URL}`;

  console.log('[monitor] Alert:', subject);
  console.log(body);

  if (!transporter) return;
  if (!ALERT_TO) {
    console.warn('[monitor] No alert recipient configured (ALERT_EMAIL_TO / ADMIN_EMAIL / VENDOR_EMAIL).');
    return;
  }

  try {
    await transporter.sendMail({
      from: ALERT_FROM,
      to: ALERT_TO,
      subject,
      text: body,
    });
    console.log('[monitor] Email sent to', ALERT_TO);
  } catch (err) {
    console.error('[monitor] Failed to send email alert:', err.message || err);
  }
}

async function checkOnce() {
  try {
    const res = await axios.get(MONITOR_URL, { timeout: 15000 });
    const ok = res.status >= 200 && res.status < 400;
    if (ok) {
      failureCount = 0;
      if (lastStateUp === false || lastStateUp === null) {
        await sendAlert(`Recovery: ${MONITOR_URL} is reachable`, `The monitored site ${MONITOR_URL} is reachable again (HTTP ${res.status}).`);
      }
      lastStateUp = true;
      console.log(`[monitor] OK ${res.status} ${MONITOR_URL}`);
    } else {
      failureCount += 1;
      console.warn(`[monitor] Non-OK status ${res.status} (${failureCount}/${FAILURE_THRESHOLD})`);
      if (failureCount >= FAILURE_THRESHOLD && lastStateUp !== false) {
        await sendAlert(`DOWN: ${MONITOR_URL} returned ${res.status}`, `The monitored site ${MONITOR_URL} returned HTTP ${res.status}.
Failures: ${failureCount}`);
        lastStateUp = false;
      }
    }
  } catch (err) {
    failureCount += 1;
    console.error(`[monitor] Request error (${failureCount}/${FAILURE_THRESHOLD}):`, err.message || err);
    if (failureCount >= FAILURE_THRESHOLD && lastStateUp !== false) {
      await sendAlert(`DOWN: ${MONITOR_URL} is unreachable`, `The monitored site ${MONITOR_URL} could not be reached. Error: ${err.message || err}`);
      lastStateUp = false;
    }
  }
}

async function start() {
  console.log(`[monitor] Starting monitor for ${MONITOR_URL} — interval ${INTERVAL_MINUTES} minute(s)`);
  // initial immediate check
  await checkOnce();
  // schedule periodic checks
  const id = setInterval(checkOnce, CHECK_INTERVAL_MS);

  process.on('SIGINT', () => {
    clearInterval(id);
    console.log('[monitor] Stopped by SIGINT');
    process.exit(0);
  });
}

start().catch((err) => {
  console.error('[monitor] Fatal error:', err);
  process.exit(1);
});
