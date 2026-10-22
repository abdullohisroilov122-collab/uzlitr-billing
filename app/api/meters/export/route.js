// GET /api/meters/export — Excel list of all meters, for signed-in staff.
import { db } from "@/lib/db";
import { currentUser, isStaff } from "@/lib/auth";
import { STATUS_SQL } from "@/lib/meters";
import { getT } from "@/lib/i18n";
import { workbook, xlsxResponse, tashkentDate } from "@/lib/excel";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!isStaff(user)) return new Response("Unauthorized", { status: 401 });
  const t = getT();
  const sql = await db();
  const rows = await sql`
    SELECT m.meter_serial, m.modem_serial, md.name AS model, c.name AS customer, c.account_number, c.phone,
           m.last_value, m.last_battery, m.last_signal, m.last_seen_at, ${sql.unsafe(STATUS_SQL)} AS status
    FROM meters m LEFT JOIN models md ON md.id = m.model_id LEFT JOIN customers c ON c.id = m.customer_id
    ORDER BY m.id`;
  const status = { active: t("st_active"), offline: t("st_offline"), never: t("st_never") };
  const buffer = await workbook({
    title: `UZLITRPRO · ${t("meters_title")}`,
    sheet: t("nav_meters"),
    columns: [
      { key: "meter_serial", header: t("meter_serial"), width: 22 },
      { key: "modem_serial", header: t("modem_serial"), width: 22 },
      { key: "model", header: t("model"), width: 14 },
      { key: "customer", header: t("customer"), width: 30 },
      { key: "account_number", header: t("account_number"), width: 18 },
      { key: "phone", header: t("phone"), width: 18 },
      { key: "last_value", header: `${t("reading")}, m³`, width: 14, numFmt: "0.000" },
      { key: "last_battery", header: `${t("battery")}, V`, width: 12, numFmt: "0.000" },
      { key: "last_signal", header: t("signal"), width: 10 },
      { key: "last_seen_at", header: t("last_signal"), width: 20, numFmt: "dd.mm.yyyy hh:mm" },
      { key: "status", header: t("status"), width: 12 }
    ],
    rows: rows.map((r) => ({
      ...r,
      last_value: r.last_value === null ? null : Number(r.last_value),
      last_battery: r.last_battery === null ? null : Number(r.last_battery),
      last_seen_at: tashkentDate(r.last_seen_at),
      status: status[r.status]
    }))
  });
  return xlsxResponse(buffer, `uzlitrpro-meters-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
