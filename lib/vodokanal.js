// Forwards readings to the Uztelecom water-meter API (Vodokanal), one reading per request.
// Spec: POST https://watermeter.uztelecom.uz/api/Meter/Post, "Authorization: Bearer <token>", body { meter: {...} },
// 200 with no body on success, { code, expt, memo } on error.
import { db } from "./db";
import { sendTelegram } from "./telegram";

export const MAX_ATTEMPTS = 10;
export const UZTELECOM_URL = "https://watermeter.uztelecom.uz/api/Meter/Post";
const TZ = "Asia/Tashkent";

export function vodokanalConfigured() {
  return Boolean(process.env.VODOKANAL_API_URL);
}

// What a meter still needs before its readings can be sent. Names match the spec; empty means ready.
// INN is required, except that a customer without one may send a PINFL instead.
export function missingFields(row) {
  const need = [];
  if (!row.meter_serial) need.push("serialNumber");
  if (!row.model) need.push("model");
  if (!row.manufacturer) need.push("manufacturer");
  if (!row.diameter_mm) need.push("diameter");
  if (!row.account_number) need.push("personalAccount");
  if (!row.inn && !row.pinfl) need.push("INN");
  return need;
}

// "yyyy-MM-dd HH:mm:ss" in Tashkent time.
function postedAt(date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date(date)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

export function buildPayload(r) {
  const meter = {
    serialNumber: r.meter_serial,
    model: r.model,
    manufacturer: r.manufacturer,
    value: Math.round(Number(r.value) * 1000) / 1000,
    diameter: Number(r.diameter_mm),
    postedAt: postedAt(r.measured_at),
    INN: r.inn || "",
    personalAccount: r.account_number,
    uid: String(r.meter_id)
  };
  if (r.latitude != null && r.longitude != null) meter.location = { latitude: Number(r.latitude), longitude: Number(r.longitude) };
  if (r.cadastr_number) meter.cadastr_number = r.cadastr_number;
  if (r.pinfl) meter.pinfl = r.pinfl;
  if (r.modem_serial) meter.mdm = r.modem_serial;
  return { meter };
}

async function post(body) {
  try {
    const res = await fetch(process.env.VODOKANAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.VODOKANAL_API_KEY ? { Authorization: `Bearer ${process.env.VODOKANAL_API_KEY}` } : {})
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000)
    });
    if (res.ok) return null;
    const text = (await res.text()).slice(0, 500);
    try {
      const e = JSON.parse(text);
      return `HTTP ${res.status} · ${e.code ?? ""} ${e.expt ?? ""}${e.memo ? ` — ${e.memo}` : ""}`.trim();
    } catch {
      return `HTTP ${res.status}: ${text.slice(0, 300)}`;
    }
  } catch (err) {
    return String(err?.message || err).slice(0, 300);
  }
}

// Sends pending readings oldest first. Readings of meters that are missing required data stay pending, untouched,
// until the data is filled in. Stops early if the API itself is failing, or when the time budget runs out.
export async function forwardPending({ limit = 300, budgetMs = 45000 } = {}) {
  if (!vodokanalConfigured()) return { paused: true, sent: 0, failed: 0 };
  const sql = await db();
  const rows = await sql`
    SELECT r.id, r.value, r.measured_at, m.id AS meter_id, m.meter_serial, m.modem_serial,
           md.name AS model, md.manufacturer, md.diameter_mm,
           c.account_number, c.inn, c.pinfl, c.cadastr_number, c.latitude, c.longitude
    FROM readings r
    JOIN meters m ON m.id = r.meter_id
    JOIN customers c ON c.id = m.customer_id
    LEFT JOIN models md ON md.id = m.model_id
    WHERE r.forwarded_at IS NULL AND r.forward_attempts < ${MAX_ATTEMPTS}
      AND m.meter_serial IS NOT NULL AND md.name IS NOT NULL AND md.manufacturer IS NOT NULL AND md.diameter_mm IS NOT NULL
      AND c.account_number IS NOT NULL AND (c.inn IS NOT NULL OR c.pinfl IS NOT NULL)
    ORDER BY r.id LIMIT ${limit}`;

  const started = Date.now();
  let sent = 0, failed = 0, lastError = null, failsInRow = 0;
  for (const r of rows) {
    if (Date.now() - started > budgetMs || failsInRow >= 5) break;
    const error = await post(buildPayload(r));
    if (!error) {
      await sql`UPDATE readings SET forwarded_at = now(), forward_error = NULL WHERE id = ${r.id}`;
      sent++; failsInRow = 0;
    } else {
      await sql`UPDATE readings SET forward_attempts = forward_attempts + 1, forward_error = ${error} WHERE id = ${r.id}`;
      failed++; failsInRow++; lastError = error;
    }
  }
  if (failed) await sendTelegram(`⚠️ UZLITR: ${failed} ta ko'rsatkich Vodokanalga yuborilmadi.\n${lastError}`).catch(() => {});
  return { paused: false, sent, failed, error: lastError };
}
