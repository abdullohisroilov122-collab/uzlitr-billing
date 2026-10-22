import { db } from "./db";
import { sendTelegram } from "./telegram";

export const MAX_ATTEMPTS = 10;

export function vodokanalConfigured() {
  return Boolean(process.env.VODOKANAL_API_URL);
}

// Builds the request body. Adjust this one function once Vodokanal shares its API format.
function buildPayload(rows) {
  return {
    source: "uzlitr",
    readings: rows.map((r) => ({
      account_number: r.account_number,
      meter_serial: r.meter_serial,
      modem_serial: r.modem_serial,
      value: Number(r.value),
      unit: "m3",
      measured_at: new Date(r.measured_at).toISOString()
    }))
  };
}

// Sends pending readings of meters whose customer has an account number, in batches.
export async function forwardPending({ limit = 500 } = {}) {
  if (!vodokanalConfigured()) return { paused: true, sent: 0, failed: 0 };
  const sql = await db();
  const rows = await sql`
    SELECT r.id, r.value, r.measured_at, c.account_number, m.meter_serial, m.modem_serial
    FROM readings r JOIN meters m ON m.id = r.meter_id JOIN customers c ON c.id = m.customer_id
    WHERE r.forwarded_at IS NULL AND r.forward_attempts < ${MAX_ATTEMPTS} AND c.account_number IS NOT NULL
    ORDER BY r.id LIMIT ${limit}`;
  if (!rows.length) return { paused: false, sent: 0, failed: 0 };

  const ids = rows.map((r) => r.id);
  let error = null;
  try {
    const res = await fetch(process.env.VODOKANAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.VODOKANAL_API_KEY ? { Authorization: `Bearer ${process.env.VODOKANAL_API_KEY}` } : {})
      },
      body: JSON.stringify(buildPayload(rows)),
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) error = `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`;
  } catch (err) {
    error = String(err?.message || err).slice(0, 300);
  }

  if (!error) {
    await sql`UPDATE readings SET forwarded_at = now(), forward_error = NULL WHERE id = ANY(${ids})`;
    return { paused: false, sent: ids.length, failed: 0 };
  }
  await sql`
    UPDATE readings SET forward_attempts = forward_attempts + 1, forward_error = ${error}
    WHERE id = ANY(${ids})`;
  await sendTelegram(`⚠️ UZLITR: ${ids.length} ta ko'rsatkich Vodokanalga yuborilmadi.\n${error}`).catch(() => {});
  return { paused: false, sent: 0, failed: ids.length, error };
}
