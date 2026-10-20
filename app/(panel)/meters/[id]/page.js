import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, hasRole } from "@/lib/auth";
import { getT, getLang } from "@/lib/i18n";
import { STATUS_SQL } from "@/lib/meters";
import { fmtDate, fmtM3, fmtAgo } from "@/lib/format";
import Icon from "@/components/Icon";
import Status from "@/components/Status";
import Flash from "@/components/Flash";
import MeterForm from "@/components/MeterForm";
import { ConfirmSubmit } from "@/components/client";
import { deleteMeter } from "@/app/actions/meters";

export default async function MeterPage({ params, searchParams }) {
  const user = await requireUser();
  const t = getT(), lang = getLang();
  const sql = await db();
  const id = Number(params.id);
  if (!id) notFound();
  const [meter] = await sql`
    SELECT m.*, md.name AS model, ${sql.unsafe(STATUS_SQL)} AS status
    FROM meters m LEFT JOIN models md ON md.id = m.model_id WHERE m.id = ${id}`;
  if (!meter) notFound();
  const readings = await sql`SELECT * FROM readings WHERE meter_id = ${id} ORDER BY measured_at DESC LIMIT 100`;
  const models = await sql`SELECT id, name FROM models ORDER BY name`;

  return (
    <>
      <div className="head">
        <div><h1 className="mono">{meter.meter_serial || meter.modem_serial}</h1>
          <p>{meter.model || "—"} · IMEI <span className="mono">{meter.modem_serial}</span></p></div>
        <div className="actions"><Status value={meter.status} /><Link className="btn" href="/meters">{t("back")}</Link></div>
      </div>
      <Flash searchParams={searchParams} />
      <div className="kpis">
        <div className="kpi"><span>{t("reading")}</span><strong>{fmtM3(meter.last_value)}</strong></div>
        <div className="kpi"><span>{t("last_signal")}</span><strong style={{ fontSize: 20 }}>{fmtAgo(meter.last_seen_at, lang)}</strong><span>{fmtDate(meter.last_seen_at, lang)}</span></div>
        <div className="kpi"><span>{t("battery")}</span><strong>{meter.last_battery ?? "—"}{meter.last_battery != null && " V"}</strong></div>
        <div className="kpi"><span>{t("signal")}</span><strong>{meter.last_signal ?? "—"}</strong></div>
      </div>
      <div className="grid2">
        <MeterForm meter={meter} models={models} />
        <section className="card">
          <h2><Icon name="clock" />{t("readings_history")}</h2>
          {readings.length ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ minWidth: 420 }}>
                <thead><tr><th>{t("measured_at")}</th><th className="right">{t("reading")}</th><th>{t("forwarded")}</th></tr></thead>
                <tbody>{readings.map((r) => (
                  <tr key={r.id}>
                    <td className="num">{fmtDate(r.measured_at, lang)}</td>
                    <td className="right num"><b>{fmtM3(r.value)}</b></td>
                    <td>{r.forwarded_at ? <span className="chip c-ok">{t("sent")}</span>
                      : r.forward_error ? <span className="chip c-bad" title={r.forward_error}>{t("failed")} ×{r.forward_attempts}</span>
                      : <span className="chip c-warn">{t("pending")}</span>}</td>
                  </tr>))}
                </tbody>
              </table>
            </div>
          ) : <p>{t("no_readings")}</p>}
        </section>
      </div>
      {hasRole(user, "admin") && (
        <form action={deleteMeter} className="actions">
          <input type="hidden" name="id" value={meter.id} />
          <ConfirmSubmit label={t("delete")} question={t("confirm_delete")} confirmLabel={t("yes_delete")} cancelLabel={t("cancel")} />
        </form>
      )}
    </>
  );
}
