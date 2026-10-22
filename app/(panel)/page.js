import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser, hasRole } from "@/lib/auth";
import { getT, getLang } from "@/lib/i18n";
import { STATUS_SQL } from "@/lib/meters";
import { vodokanalConfigured } from "@/lib/vodokanal";
import { getAlerts } from "@/lib/alerts";
import { periodFrom } from "@/lib/usage";
import { fmtAgo, fmtM3 } from "@/lib/format";
import Icon from "@/components/Icon";
import Status from "@/components/Status";
import { SubmitButton } from "@/components/client";
import { WeekCard, UsageCurveCard } from "@/components/dash";
import { forwardNow } from "@/app/actions/forward";

export default async function Dashboard({ searchParams }) {
  const user = await requireUser();
  const t = getT(), lang = getLang();
  const sql = await db();
  const period = periodFrom(searchParams.period);

  const [[counts], [{ pending }], [{ customers }], recent, alerts] = await Promise.all([
    sql`
      SELECT count(*)::int AS total,
        count(*) FILTER (WHERE ${sql.unsafe(STATUS_SQL)} = 'active')::int AS active,
        count(*) FILTER (WHERE ${sql.unsafe(STATUS_SQL)} = 'offline')::int AS offline,
        count(*) FILTER (WHERE m.customer_id IS NOT NULL)::int AS linked
      FROM meters m LEFT JOIN models md ON md.id = m.model_id`,
    sql`SELECT count(*)::int AS pending FROM readings WHERE forwarded_at IS NULL`,
    sql`SELECT count(*)::int AS customers FROM customers`,
    sql`
      SELECT m.id, m.meter_serial, m.modem_serial, md.name AS model, c.name AS customer, m.last_value, m.last_seen_at,
             ${sql.unsafe(STATUS_SQL)} AS status
      FROM meters m LEFT JOIN models md ON md.id = m.model_id LEFT JOIN customers c ON c.id = m.customer_id
      WHERE m.last_seen_at IS NOT NULL ORDER BY m.last_seen_at DESC LIMIT 7`,
    getAlerts({ includeForwarding: hasRole(user, "admin") })
  ]);

  const pct = counts.total ? Math.round((counts.active / counts.total) * 100) : 0;
  const kpi = (icon, cls, value, label, extra, href) => {
    const body = (<><div className="row"><span className={`ico ${cls}`}><Icon name={icon} /></span>{extra}</div><strong>{value}</strong><span>{label}</span></>);
    return href ? <Link className="kpi" href={href}>{body}</Link> : <div className="kpi">{body}</div>;
  };

  return (
    <>
      <div className="head">
        <div><h1>{t("dash_title")}</h1><p>{t("dash_sub")}</p></div>
        <div className="actions">
          <Link className="btn" href="/"><Icon name="refresh" />{t("refresh")}</Link>
          <Link className="btn primary" href="/meters/new"><Icon name="plus" />{t("new_meter")}</Link>
        </div>
      </div>
      {searchParams?.msg && <div className="banner ok">{t(searchParams.msg, { n: searchParams.n })}</div>}
      {searchParams?.err && <div className="banner bad">{t(searchParams.err, { n: searchParams.n })}</div>}

      <div className="kpis">
        {kpi("drop", "c-acc", counts.total, t("kpi_total"), null, "/meters")}
        {kpi("wifi", "c-ok", counts.active, t("kpi_online"), <span className="chip c-ok">{pct}%</span>, "/meters?status=active")}
        {kpi("wifiOff", "c-bad", counts.offline, t("kpi_offline"), null, "/meters?status=offline")}
        {kpi("building", "c-info", customers, t("kpi_customers"), <span className="chip c-info">{counts.linked} {t("kpi_linked").toLowerCase()}</span>, "/customers")}
        {kpi("send", "c-warn", pending, t("kpi_pending"))}
      </div>

      <div className="grid2">
        <UsageCurveCard meterIds={null} period={period} periodHref={(p) => `/?period=${p}`} />
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <WeekCard meterIds={null} />
          <section className="card">
            <h2><span className="ico c-red"><Icon name="bell" /></span>{t("notifications")}{alerts.length > 0 && <span className="chip c-red">{alerts.length}</span>}</h2>
            {alerts.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {alerts.slice(0, 5).map((a, i) => (
                  <Link key={i} href={a.meterId ? `/meters/${a.meterId}` : "/"} className="actions" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
                    <span><b>{t(`al_${a.type}`)}</b>{a.label && <span className="mono muted"> · {a.label}</span>}</span>
                    <span className={`chip ${a.severity === "bad" ? "c-bad" : "c-warn"}`}>{a.severity === "bad" ? t("critical") : t("warning")}</span>
                  </Link>
                ))}
              </div>
            ) : <p>{t("no_alerts")}</p>}
          </section>
          <section className="card">
            <h2><span className="ico c-warn"><Icon name="send" /></span>{t("forward_status")}</h2>
            {vodokanalConfigured()
              ? <span className="chip dot c-ok" style={{ alignSelf: "flex-start" }}>{t("forward_active")}</span>
              : <div className="banner warn">{t("forward_paused")}</div>}
            <div className="meta"><span>{t("kpi_pending")}: <b>{pending}</b></span></div>
            {hasRole(user, "admin") && vodokanalConfigured() && (
              <form action={forwardNow}><SubmitButton className="btn"><Icon name="send" />{t("forward_now")}</SubmitButton></form>
            )}
          </section>
        </div>
      </div>

      <section className="card flush">
        <div className="card-head"><h2><span className="ico c-acc"><Icon name="clock" /></span>{t("recent_signals")}</h2>
          <Link className="link" href="/meters">{t("all")}<Icon name="arrowRight" /></Link></div>
        {recent.length ? (
          <div className="tablewrap compact"><table>
            <thead><tr><th>{t("meter_serial")}</th><th>{t("customer")}</th><th>{t("status")}</th><th className="right">{t("reading")}</th><th className="right">{t("last_signal")}</th></tr></thead>
            <tbody>{recent.map((m) => (
              <tr key={m.id}>
                <td><Link href={`/meters/${m.id}`} className="mono"><b>{m.meter_serial || m.modem_serial}</b></Link><span className="sub">{m.model || "—"}</span></td>
                <td>{m.customer || <span className="unset">{t("not_linked")}</span>}</td>
                <td><Status value={m.status} /></td>
                <td className="right num"><b>{fmtM3(m.last_value)}</b></td>
                <td className="right muted num">{fmtAgo(m.last_seen_at, lang)}</td>
              </tr>))}
            </tbody>
          </table></div>
        ) : <div className="empty">{t("empty")}</div>}
      </section>
    </>
  );
}
