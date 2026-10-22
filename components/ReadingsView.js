import Link from "next/link";
import { getT, getLang } from "@/lib/i18n";
import { fmtDate } from "@/lib/format";
import { readingsWithUsage, countReadings, dateRange } from "@/lib/usage";
import Icon from "./Icon";
import ReadingsTable from "./ReadingsTable";

const PER_PAGE = 100;
const num = (v, d = 3) => (v === null || v === undefined ? "—" : (+Number(v).toFixed(d)).toString());

// Full reading history of one meter: date range, Excel export, click a row for details.
export default async function ReadingsView({ meter, searchParams, backHref, basePath, showForward, extraParams = {} }) {
  const t = getT(), lang = getLang();
  const { from, to, fromStr, toStr } = dateRange(searchParams.from, searchParams.to);
  const page = Math.max(1, Number(searchParams.page) || 1);
  const [rows, total] = await Promise.all([
    readingsWithUsage(meter.id, { from, to, limit: PER_PAGE, offset: (page - 1) * PER_PAGE }),
    countReadings(meter.id, { from, to })
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const qs = (extra) => new URLSearchParams({ ...extraParams, ...(fromStr && { from: fromStr }), ...(toStr && { to: toStr }), ...extra }).toString();
  const resetHref = Object.keys(extraParams).length ? `${basePath}?${new URLSearchParams(extraParams)}` : basePath;
  const exportHref = `/api/readings/export?${qs({ meter: meter.id })}`;

  const data = rows.map((r) => ({
    id: String(r.id),
    date: fmtDate(r.measured_at, lang, true, true),
    received: fmtDate(r.received_at, lang, true, true),
    value: num(r.value), used: num(r.used),
    signal: r.signal === null ? "—" : String(r.signal), battery: num(r.battery),
    forward: r.forwarded_at ? t("sent") : r.forward_error ? `${t("failed")} ×${r.forward_attempts}` : t("pending"),
    forwardCls: r.forwarded_at ? "c-ok" : r.forward_error ? "c-bad" : "c-warn",
    forwardError: r.forward_error
  }));

  return (
    <section className="card flush">
      <div className="card-head" style={{ flexWrap: "wrap" }}>
        <h2>
          <Link href={backHref} className="btn icon" aria-label={t("back")}><Icon name="arrowLeft" /></Link>
          <span style={{ color: "var(--accent)", display: "inline-flex" }}><Icon name="history" /></span>{t("recent_readings")}
          <span className="chip c-mut mono">{meter.meter_serial || meter.modem_serial}</span>
        </h2>
        <a className="btn soft" href={exportHref}><Icon name="excel" />Excel</a>
      </div>
      <form method="get" action={basePath} className="toolbar" style={{ padding: "0 20px 18px" }}>
        {Object.entries(extraParams).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <label className="field">{t("date_from")}<input className="f" type="date" name="from" defaultValue={fromStr} /></label>
        <label className="field">{t("date_to")}<input className="f" type="date" name="to" defaultValue={toStr} /></label>
        <button className="btn primary" type="submit">{t("show")}</button>
        {(fromStr || toStr) && <Link className="btn" href={resetHref}>{t("reset")}</Link>}
      </form>
      <div className="tablewrap" style={{ borderTop: "1px solid var(--line)" }}>
        {data.length ? (
          <ReadingsTable rows={data} showForward={showForward} offset={(page - 1) * PER_PAGE} labels={{
            date: t("date"), reading: `${t("reading")}, m³`, usage: `${t("usage")}, m³`, signal: t("signal"),
            battery: t("battery"), forwarded: t("forwarded"), details: t("reading_details"), close: t("close"),
            meter_serial: t("meter_serial"), modem_serial: t("modem_serial"), received: t("received_at"),
            meterSerial: meter.meter_serial, modemSerial: meter.modem_serial
          }} />
        ) : <div className="empty"><b>{t("no_readings")}</b>{(fromStr || toStr) && <span>{t("try_other_dates")}</span>}</div>}
      </div>
      {pages > 1 ? (
        <div className="pager" style={{ padding: "14px 20px", borderTop: "1px solid var(--line)" }}>
          <span>{(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} / {total}</span>
          <div className="actions">
            <Link className="btn sm" aria-disabled={page <= 1} href={`${basePath}?${qs({ page: page - 1 })}`}>{t("prev")}</Link>
            <Link className="btn sm" aria-disabled={page >= pages} href={`${basePath}?${qs({ page: page + 1 })}`}>{t("next")}</Link>
          </div>
        </div>
      ) : data.length > 0 && <div className="foot-note">{t("all_shown", { n: total })}</div>}
    </section>
  );
}
