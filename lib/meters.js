import { db } from "./db";

// A meter counts as online while its last signal is younger than twice its model's ping interval.
export const STATUS_SQL = `
  CASE
    WHEN m.last_seen_at IS NULL THEN 'never'
    WHEN m.last_seen_at > now() - make_interval(hours => 2 * coalesce(md.ping_hours, 24)) THEN 'active'
    ELSE 'offline'
  END`;

const pick = (obj, ...keys) => {
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  return undefined;
};

// Accepts the field names modem platforms commonly use, so small format differences don't need code changes.
export function parseReading(raw) {
  if (!raw || typeof raw !== "object") return { error: "Each reading must be a JSON object" };
  const value = Number(pick(raw, "value", "reading", "volume", "total", "pokazanie"));
  if (!Number.isFinite(value) || value < 0) return { error: "value must be a non-negative number" };
  const when = pick(raw, "measured_at", "timestamp", "time", "datetime");
  let measuredAt = new Date();
  if (when !== undefined) {
    measuredAt = typeof when === "number" ? new Date(when < 1e12 ? when * 1000 : when) : new Date(when);
    if (Number.isNaN(measuredAt.getTime())) return { error: "measured_at is not a valid date" };
  }
  const num = (v) => (v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
  return {
    modemSerial: pick(raw, "modem_serial", "imei", "modem", "device_id") ?? null,
    meterSerial: pick(raw, "meter_serial", "meter", "serial") ?? null,
    value,
    battery: num(pick(raw, "battery", "battery_v", "voltage")),
    signal: num(pick(raw, "signal", "rssi", "csq")),
    measuredAt
  };
}

// Stores one parsed reading. Meter tokens are bound to their meter; platform tokens find
// (or register) the meter by modem serial number.
export async function storeReading(token, r) {
  const sql = await db();
  let meterId = token.meter_id;
  if (!meterId) {
    if (!r.modemSerial) return { error: "modem_serial is required" };
    const modem = String(r.modemSerial).trim();
    const [meter] = await sql`
      INSERT INTO meters (modem_serial, meter_serial)
      VALUES (${modem}, ${r.meterSerial ? String(r.meterSerial).trim() : null})
      ON CONFLICT (modem_serial) DO UPDATE SET modem_serial = EXCLUDED.modem_serial
      RETURNING id`;
    meterId = meter.id;
  }
  const [inserted] = await sql`
    INSERT INTO readings (meter_id, value, battery, signal, measured_at)
    VALUES (${meterId}, ${r.value}, ${r.battery}, ${r.signal}, ${r.measuredAt})
    ON CONFLICT (meter_id, measured_at) DO NOTHING
    RETURNING id`;
  await sql`
    UPDATE meters SET
      last_value = ${r.value}, last_battery = coalesce(${r.battery}, last_battery),
      last_signal = coalesce(${r.signal}, last_signal), last_seen_at = ${r.measuredAt}, updated_at = now()
    WHERE id = ${meterId} AND (last_seen_at IS NULL OR last_seen_at <= ${r.measuredAt})`;
  return { meterId, readingId: inserted?.id ?? null, duplicate: !inserted };
}
