# UZLITR Billing

A bridge between UZLITR modem water meters and Vodokanal. Readings come in from the modems (or the
manufacturer's platform), are stored and shown in the admin panel, and are sent on to the Vodokanal API.

```
Modem / manufacturer platform ──POST /api/ingest──▶ UZLITR (Postgres + admin panel) ──▶ Vodokanal API
                                                       └── GET /api/v1/readings (pull access for outside systems)
```

- **Stack:** Next.js 14 on Vercel, Postgres (Neon), no other services.
- **Languages:** O'zbekcha, Русский, English (switcher in the top bar).
- **Roles:** SuperAdmin (everything), Admin (users, tokens, models, audit, security), Operator (meters and
  customers), Customer (their own portal only).

## What's inside

- **Customers (Abonentlar):** individuals and companies with INN/PINFL, Vodokanal account number, address and
  map point. Meters are linked to customers.
- **Meter dashboard** (staff: `/meters/<id>`, customers: `/portal`): current reading, last 7 days of use with
  the change against the week before, a daily-use chart for 7/30/90 days, recent readings with the use between
  them, customer details and an address card with a map.
- **Reading history:** date range filter, Excel (.xlsx) export, and a details window for each reading.
- **Customer portal:** give a customer a phone number and password on their page under "Portal access".
  They see only their own meters and readings.
- **Alerts (bell):** meters offline, low battery (under 3.1 V), possible leaks (yesterday's use several times
  above normal) and readings that failed to reach Vodokanal. Computed from live data, so nothing to keep in sync.
- **Upgrading from v0.1:** on the first request the database adds the new tables and moves each meter's old
  owner name, phone and account number into a customer record automatically.

## Deploying on Vercel

1. **Import the repository.** Vercel → Add New → Project → `uzlitr-billing`. Framework preset: **Next.js**.
2. **Add the database.** In the project: Storage → Create Database → **Neon (Postgres)** → Connect.
   Vercel adds `DATABASE_URL` for you.
3. **Add environment variables** (Settings → Environment Variables):

   | Name | Value |
   |---|---|
   | `SESSION_SECRET` | A long random string, 32+ characters |
   | `ADMIN_PHONE` | Phone number of the first SuperAdmin, e.g. `+998901234567` |
   | `ADMIN_PASSWORD` | Their first password (8+ characters, upper and lower case, a digit) |
   | `CRON_SECRET` | Another long random string |
   | `VODOKANAL_API_URL` | Leave empty until Vodokanal sends its API. Forwarding stays paused while empty |
   | `VODOKANAL_API_KEY` | Vodokanal's API key, if they use one |

4. **Deploy**, then sign in with `ADMIN_PHONE` / `ADMIN_PASSWORD` and change the password in Settings.
   The database tables are created automatically on the first request.
5. **Domain:** Settings → Domains → add your domain and follow the DNS instructions.

## Sending readings: `POST /api/ingest`

Create a token in **Tokens**:
- **User token** with the "Send readings" permission, for the manufacturer's platform. It can send readings
  for any modem, and unknown modems are registered automatically.
- **Meter token**, for one modem. It can only send readings for its own meter.

```http
POST /api/ingest
Authorization: Bearer usr_xxxxxxxx
Content-Type: application/json

{
  "readings": [
    { "modem_serial": "10911262535000", "meter_serial": "2025006995", "value": 1.89,
      "battery": 3.6, "signal": -71, "measured_at": "2026-10-20T10:26:00+05:00" }
  ]
}
```

- The body can also be one reading object or a plain array. At most 500 readings per request.
- `value` is the meter's total in m³. `measured_at` defaults to the time of receipt.
- Common alternative field names are accepted: `imei` / `device_id` for `modem_serial`, `reading` / `volume`
  for `value`, `timestamp` (ISO or Unix seconds) for `measured_at`, `rssi` / `csq` for `signal`.
- The same meter and time sent twice is stored once (`duplicates` in the response).
- Limit: 120 requests per minute per token.

Response: `{ "ok": true, "accepted": 1, "duplicates": 0, "errors": [] }`

## Reading data: `GET /api/v1/readings`

For outside systems with a user token that has the "Read data" permission.
Query parameters: `account_number`, `meter_serial`, `modem_serial`, `since` (ISO date, default 7 days ago),
`limit` (max 1000).

## Forwarding to Vodokanal

- New readings are sent right after they arrive, and a daily cron job (`vercel.json`) retries failures.
  Admins can also press **Send now** on the dashboard.
- Only meters with an **account number** are forwarded; others wait until one is filled in.
- Each reading is tried up to 10 times. Failures show on the meter page and go to Telegram if enabled.
- The request format lives in one function, `buildPayload` in `lib/vodokanal.js`. Adjust it to match
  Vodokanal's documentation.

## Local development

```bash
cp .env.example .env.local   # fill in DATABASE_URL etc.
npm install
npm run dev
```
