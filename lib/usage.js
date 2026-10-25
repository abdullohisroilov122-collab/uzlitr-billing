// Consumption maths. A reading is a running total (m³), so use = total minus the previous total.
import { db } from "./db";

export const PERIODS = [7, 30, 90];
const TZ = "Asia/Tashkent";

export function periodFrom(value) {
  const n = Number(value);
  return PERIODS.includes(n) ? n : 7;
}

// One row per calendar day (Tashkent time) for the last `days` days, for the given meters (or all).
export async function dailyUsage(meterIds, days) {
  const sql = await db();
  // An empty list means "no meters" (a new customer), not "all meters".
  const filter = !meterIds ? sql`` : meterIds.length ? sql`AND meter_id = ANY(${meterIds})` : sql`AND false`;
  const rows = await sql`
    WITH today AS (SELECT (now() AT TIME ZONE ${TZ})::date AS d),
    days AS (SELECT generate_series((SELECT d FROM today) - ${days - 1}::int, (SELECT d FROM today), interval '1 day')::date AS day),
    daily AS (
      SELECT meter_id, (measured_at AT TIME ZONE ${TZ})::date AS day, max(value) AS top, min(value) AS low
      FROM readings
      WHERE measured_at > now() - make_interval(days => ${days + 3}) ${filter}
      GROUP BY 1, 2),
    used AS (
      SELECT day, greatest(top - coalesce(lag(top) OVER (PARTITION BY meter_id ORDER BY day), low), 0) AS used FROM daily)
    SELECT d.day, coalesce(sum(u.used), 0)::float AS used
    FROM days d LEFT JOIN used u ON u.day = d.day GROUP BY d.day ORDER BY d.day`;
  return rows.map((r) => ({ day: r.day, used: Math.round(r.used * 1000) / 1000 }));
}

// Last 7 days against the 7 before them, for the "vs last week" badge.
export async function weekComparison(meterIds) {
  const days = await dailyUsage(meterIds, 14);
  const prev = days.slice(0, 7).reduce((a, d) => a + d.used, 0);
  const last = days.slice(7);
  const total = last.reduce((a, d) => a + d.used, 0);
  const change = prev > 0 ? Math.round(((total - prev) / prev) * 100) : null;
  return { days: last, total: Math.round(total * 1000) / 1000, change };
}

// Readings of one meter, newest first, each with the use since the reading before it.
export async function readingsWithUsage(meterId, { from, to, limit = 50, offset = 0 } = {}) {
  const sql = await db();
  const lower = from ? new Date(new Date(from).getTime() - 31 * 864e5) : null;
  const rows = await sql`
    SELECT * FROM (
      SELECT r.id, r.value, r.battery, r.signal, r.measured_at, r.received_at, r.forwarded_at, r.forward_error, r.forward_attempts,
             r.value - lag(r.value) OVER (ORDER BY r.measured_at) AS used
      FROM readings r
      WHERE r.meter_id = ${meterId} ${lower ? sql`AND r.measured_at >= ${lower}` : sql``}
    ) x
    WHERE true ${from ? sql`AND x.measured_at >= ${from}` : sql``} ${to ? sql`AND x.measured_at < ${to}` : sql``}
    ORDER BY x.measured_at DESC
    LIMIT ${limit} OFFSET ${offset}`;
  return rows.map((r) => ({
    ...r,
    value: Number(r.value),
    battery: r.battery === null ? null : Number(r.battery),
    used: r.used === null ? null : Math.max(Number(r.used), 0)
  }));
}

export async function countReadings(meterId, { from, to } = {}) {
  const sql = await db();
  const [{ n }] = await sql`
    SELECT count(*)::int AS n FROM readings WHERE meter_id = ${meterId}
    ${from ? sql`AND measured_at >= ${from}` : sql``} ${to ? sql`AND measured_at < ${to}` : sql``}`;
  return n;
}

// Parses ?from=YYYY-MM-DD&to=YYYY-MM-DD as whole Tashkent days ("to" inclusive).
export function dateRange(fromStr, toStr) {
  const ok = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");
  const from = ok(fromStr) ? new Date(`${fromStr}T00:00:00+05:00`) : null;
  const to = ok(toStr) ? new Date(new Date(`${toStr}T00:00:00+05:00`).getTime() + 864e5) : null;
  return { from, to, fromStr: ok(fromStr) ? fromStr : "", toStr: ok(toStr) ? toStr : "" };
}
