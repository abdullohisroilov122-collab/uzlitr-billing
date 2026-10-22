// Things that need attention, computed from current data (nothing to keep in sync).
import { db } from "./db";
import { STATUS_SQL } from "./meters";

export const LOW_BATTERY_V = 3.1;
export const LEAK_MIN_M3 = 0.5;
export const LEAK_FACTOR = 3;

export async function getAlerts({ customerId = null, includeForwarding = false } = {}) {
  const sql = await db();
  const scope = customerId ? sql`AND m.customer_id = ${customerId}` : sql``;
  const alerts = [];

  const offline = await sql`
    SELECT m.id, coalesce(m.meter_serial, m.modem_serial) AS label, m.last_seen_at
    FROM meters m LEFT JOIN models md ON md.id = m.model_id
    WHERE ${sql.unsafe(STATUS_SQL)} = 'offline' ${scope} ORDER BY m.last_seen_at LIMIT 20`;
  for (const m of offline) alerts.push({ type: "offline", severity: "bad", meterId: m.id, label: m.label, at: m.last_seen_at });

  const battery = await sql`
    SELECT m.id, coalesce(m.meter_serial, m.modem_serial) AS label, m.last_battery
    FROM meters m WHERE m.last_battery IS NOT NULL AND m.last_battery < ${LOW_BATTERY_V} ${scope} LIMIT 20`;
  for (const m of battery) alerts.push({ type: "battery", severity: "warn", meterId: m.id, label: m.label, value: Number(m.last_battery) });

  // Possible leak: yesterday's use is several times the meter's usual daily use.
  const leaks = await sql`
    WITH daily AS (
      SELECT r.meter_id, (r.measured_at AT TIME ZONE 'Asia/Tashkent')::date AS day, max(r.value) AS top
      FROM readings r JOIN meters m ON m.id = r.meter_id
      WHERE r.measured_at > now() - interval '17 days' ${scope}
      GROUP BY 1, 2),
    used AS (SELECT meter_id, day, top - lag(top) OVER (PARTITION BY meter_id ORDER BY day) AS used FROM daily),
    stats AS (
      SELECT meter_id,
        max(used) FILTER (WHERE day = (now() AT TIME ZONE 'Asia/Tashkent')::date - 1) AS yesterday,
        avg(used) FILTER (WHERE day < (now() AT TIME ZONE 'Asia/Tashkent')::date - 1) AS usual
      FROM used GROUP BY meter_id)
    SELECT s.meter_id AS id, coalesce(m.meter_serial, m.modem_serial) AS label, s.yesterday::float AS yesterday, s.usual::float AS usual
    FROM stats s JOIN meters m ON m.id = s.meter_id
    WHERE s.yesterday >= ${LEAK_MIN_M3} AND s.yesterday > ${LEAK_FACTOR} * coalesce(s.usual, 0)
    LIMIT 20`;
  for (const m of leaks) alerts.push({ type: "leak", severity: "bad", meterId: m.id, label: m.label, value: m.yesterday });

  if (includeForwarding) {
    const [{ n }] = await sql`SELECT count(*)::int AS n FROM readings WHERE forwarded_at IS NULL AND forward_error IS NOT NULL`;
    if (n) alerts.push({ type: "forward", severity: "warn", value: n });
  }
  const order = { bad: 0, warn: 1 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}
