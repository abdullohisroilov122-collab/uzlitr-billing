// GET /api/readings/export?meter=<id>&from=YYYY-MM-DD&to=YYYY-MM-DD — Excel of one meter's readings.
// Staff may export any meter; a customer only their own.
import { db } from "@/lib/db";
import { currentUser, isStaff } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { readingsWithUsage, dateRange } from "@/lib/usage";
import { workbook, xlsxResponse, tashkentDate } from "@/lib/excel";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request) {
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const p = request.nextUrl.searchParams;
  const meterId = Number(p.get("meter"));
  const sql = await db();
  const [meter] = await sql`SELECT id, meter_serial, modem_serial, customer_id FROM meters WHERE id = ${meterId || 0}`;
  if (!meter || (!isStaff(user) && meter.customer_id !== user.customer_id)) return new Response("Not found", { status: 404 });

  const t = getT();
  const { from, to, fromStr, toStr } = dateRange(p.get("from"), p.get("to"));
  const rows = await readingsWithUsage(meter.id, { from, to, limit: 50000 });
  const serial = meter.meter_serial || meter.modem_serial;
  const buffer = await workbook({
    title: `UZLITRPRO · ${t("meter")} ${serial}${fromStr || toStr ? ` · ${fromStr || "…"} — ${toStr || "…"}` : ""}`,
    sheet: t("readings_history"),
    columns: [
      { key: "n", header: "№", width: 7 },
      { key: "measured_at", header: t("date"), width: 20, numFmt: "dd.mm.yyyy hh:mm:ss" },
      { key: "value", header: `${t("reading")}, m³`, width: 16, numFmt: "0.000" },
      { key: "used", header: `${t("usage")}, m³`, width: 14, numFmt: "0.000" },
      { key: "signal", header: t("signal"), width: 10 },
      { key: "battery", header: `${t("battery")}, V`, width: 12, numFmt: "0.000" },
      { key: "meter", header: t("meter_serial"), width: 20 },
      { key: "modem", header: t("modem_serial"), width: 20 }
    ],
    rows: rows.map((r, i) => ({
      n: i + 1, measured_at: tashkentDate(r.measured_at), value: r.value, used: r.used,
      signal: r.signal, battery: r.battery, meter: meter.meter_serial, modem: meter.modem_serial
    }))
  });
  return xlsxResponse(buffer, `uzlitrpro-${serial}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
