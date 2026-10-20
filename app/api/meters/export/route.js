// GET /api/meters/export — CSV of all meters for signed-in staff.
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { readSession, SESSION_COOKIE } from "@/lib/session";
import { STATUS_SQL } from "@/lib/meters";

export const dynamic = "force-dynamic";

const cell = (v) => {
  const s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET() {
  const session = await readSession(cookies().get(SESSION_COOKIE)?.value);
  if (!session) return new Response("Unauthorized", { status: 401 });
  const sql = await db();
  const [user] = await sql`SELECT id FROM users WHERE id = ${session.userId} AND is_active`;
  if (!user) return new Response("Unauthorized", { status: 401 });
  const rows = await sql.unsafe(`
    SELECT m.meter_serial, m.modem_serial, md.name AS model, m.account_number, m.owner_name, m.owner_phone,
           m.address, m.last_value, m.last_battery, m.last_signal, m.last_seen_at, ${STATUS_SQL} AS status
    FROM meters m LEFT JOIN models md ON md.id = m.model_id ORDER BY m.id`);
  const head = ["meter_serial", "modem_serial", "model", "account_number", "owner_name", "owner_phone",
    "address", "last_value_m3", "battery", "signal", "last_seen_at", "status"];
  const csv = "﻿" + [head.join(","), ...rows.map((r) => [r.meter_serial, r.modem_serial, r.model, r.account_number,
    r.owner_name, r.owner_phone, r.address, r.last_value, r.last_battery, r.last_signal, r.last_seen_at, r.status].map(cell).join(","))].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="uzlitr-meters-${new Date().toISOString().slice(0, 10)}.csv"`
    }
  });
}
