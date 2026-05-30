# kitchenkadmin

## Monitor

A small monitor script is provided at `scripts/monitor.js` that periodically checks a site and sends alerts via configured SMTP.

Usage:

1. Configure environment variables in `.env` (SMTP settings are used for email alerts). Optional vars:

- `MONITOR_URL` (default: `https://kkstores.com`)
- `MONITOR_INTERVAL_MINUTES` (default: `5`)
- `MONITOR_FAILURE_THRESHOLD` (default: `3`)
- `ALERT_EMAIL_TO` (defaults to `ADMIN_EMAIL` or `VENDOR_EMAIL`)

2. Install dependencies (if not already installed):

```bash
cd kitchenkadmin
npm install
```

3. Run the monitor:

```bash
npm run monitor
```

The monitor logs to the console and will send an email when the site is detected as down (after the configured failure threshold), and when it recovers.
