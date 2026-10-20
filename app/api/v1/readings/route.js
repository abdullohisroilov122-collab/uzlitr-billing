// GET /api/v1/readings — outside systems (e.g. Vodokanal) read readings with a token that has the "read" scope.
// Query: account_number | meter_serial | modem_serial, since (ISO date), limit (max 1000).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bearer, findToken } from "@/lib/tokens";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const token = await findToken(bearer(request));
  if (!token || token.kind !== "user" || !token.scopes.includes("read")) {
    return NextResponse.json({ ok: false, error: "Invalid or missing token" }, { status: 401 });
  }
  if (!(await rateLimit(`read:${token.id}`, 60, 60)).allowed) {
    return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": "60" } });
  }
  const p = request.nextUrl.searchParams;
  const since = p.get("since") ? new Date(p.get("since")) : new Date(Date.now() - 7 * 864e5);
  if (Number.isNaN(since.getTime())) return NextResponse.json({ ok: false, error: "since is not a valid date" }, { status: 400 });
  const limit = Math.min(Math.max(parseInt(p.get("limit") || "500", 10) || 500, 1), 1000);
  const account = p.get("account_number"), meter = p.get("meter_serial"), modem = p.get("modem_serial");

  const sql = await db();
  const rows = await sql`
    SELECT m.account_number, m.meter_serial, m.modem_serial, r.value, r.battery, r.signal, r.measured_at
    FROM readings r JOIN meters m ON m.id = r.meter_id
    WHERE r.measured_at >= ${since}
      ${account ? sql`AND m.account_number = ${account}` : sql``}
      ${meter ? sql`AND m.meter_serial = ${meter}` : sql``}
      ${modem ? sql`AND m.modem_serial = ${modem}` : sql``}
    ORDER BY r.measured_at DESC LIMIT ${limit}`;
  return NextResponse.json({
    ok: true,
    readings: rows.map((r) => ({ ...r, value: Number(r.value), battery: r.battery === null ? null : Number(r.battery), unit: "m3" }))
  });
}
