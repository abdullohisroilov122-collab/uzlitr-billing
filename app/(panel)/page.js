import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser, hasRole } from "@/lib/auth";
import { getT, getLang } from "@/lib/i18n";
import { STATUS_SQL } from "@/lib/meters";
import { vodokanalConfigured } from "@/lib/vodokanal";
import { fmtAgo, fmtM3 } from "@/lib/format";
import Icon from "@/components/Icon";
import Status from "@/components/Status";
import { SubmitButton } from "@/components/client";
import { forwardNow } from "@/app/actions/forward";

export default async function Dashboard({ searchParams }) {
  const user = await requireUser();
  const t = getT(), lang = getLang();
  const sql = await db();

  const [counts] = await sql.unsafe(`
    SELECT count(*)::int AS total,
      count(*) FILTER (WHERE ${STATUS_SQL} = 'active')::int AS active,
      count(*) FILTER (WHERE ${STATUS_SQL} <> 'active')::int AS offline,
      count(*) FILTER (WHERE m.account_number IS NOT NULL OR m.owner_name IS NOT NULL)::int AS linked
    FROM meters m LEFT JOIN models md ON md.id = m.model_id`);
  const [{ pending }] = await sql`SELECT count(*)::int AS pending FROM readings WHERE forwarded_at IS NULL`;
  // Daily use per meter = that day's last reading minus the previous day's last reading.
  const usage = await sql`
    WITH days AS (SELECT generate_series(current_date - 6, current_date, interval '1 day')::date AS day),
    daily AS (
      SELECT meter_id, (measured_at AT TIME ZONE 'Asia/Tashkent')::date AS day, max(value) AS top, min(value) AS low
      FROM readings WHERE measured_at > now() - interval '9 days' GROUP BY meter_id, 2),
    used AS (
      SELECT day, greatest(top - coalesce(lag(top) OVER (PARTITION BY meter_id ORDER BY day), low), 0) AS used FROM daily)
    SELECT d.day, coalesce(sum(u.used), 0)::float AS used FROM days d LEFT JOIN used u ON u.day = d.day
    GROUP BY d.day ORDER BY d.day`;
  const recent = await sql.unsafe(`
    SELECT m.id, m.meter_serial, m.modem_serial, md.name AS model, m.last_value, m.last_seen_at, ${STATUS_SQL} AS status
    FROM meters m LEFT JOIN models md ON md.id = m.model_id
    WHERE m.last_seen_at IS NOT NULL ORDER BY m.last_seen_at DESC LIMIT 6`);

  const pct = counts.total ? Math.round((counts.active / counts.total) * 100) : 0;
  const kpi = (icon, cls, value, label, extra) => (
    <div className="kpi">
      <div className="row"><div className={`ico ${cls}`}><Icon name={icon} /></div>{extra}</div>
      <strong>{value}</strong><span>{label}</span>
    </div>
  );

  return (
    <>
      <div className="head">
        <div><h1>{t("dash_title")}</h1><p>{t("dash_sub")}</p></div>
        <div className="actions">
          <Link className="btn" href="/"><Icon name="refresh" />{t("refresh")}</Link>
          <Link className="btn primary" href="/meters"><Icon name="drop" />{t("nav_meters")}</Link>
        </div>
      </div>
      {searchParams?.msg && <div className="banner ok">{t(searchParams.msg, { n: searchParams.n })}</div>}
      {searchParams?.err && <div className="banner bad">{t(searchParams.err, { n: searchParams.n })}</div>}

      <div className="kpis">
        {kpi("drop", "c-acc", counts.total, t("kpi_total"))}
        {kpi("wifi", "c-ok", counts.active, t("kpi_online"), <span className="chip c-ok">{pct}%</span>)}
        {kpi("wifiOff", "c-bad", counts.offline, t("kpi_offline"))}
        {kpi("link", "c-info", counts.linked, t("kpi_linked"))}
        {kpi("send", "c-warn", pending, t("kpi_pending"))}
      </div>

      <div className="grid2">
        <section className="card chart"><h2><Icon name="chart" />{t("weekly_usage")}</h2><UsageChart rows={usage} lang={lang} unit={t("usage_unit")} /></section>
        <section className="card">
          <h2><Icon name="send" />{t("forward_status")}</h2>
          {vodokanalConfigured()
            ? <span className="chip dot c-ok" style={{ alignSelf: "flex-start" }}>{t("forward_active")}</span>
            : <div className="banner warn">{t("forward_paused")}</div>}
          <div className="meta"><span>{t("kpi_pending")}: <b>{pending}</b></span></div>
          {hasRole(user, "admin") && vodokanalConfigured() && (
            <form action={forwardNow}><SubmitButton className="btn"><Icon name="send" />{t("forward_now")}</SubmitButton></form>
          )}
        </section>
      </div>

      <section className="card">
        <h2><Icon name="clock" />{t("recent_signals")}</h2>
        {recent.length ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ minWidth: 560 }}>
              <thead><tr><th>{t("meter_serial")}</th><th>{t("model")}</th><th>{t("status")}</th><th className="right">{t("reading")}</th><th className="right">{t("last_signal")}</th></tr></thead>
              <tbody>{recent.map((m) => (
                <tr key={m.id}>
                  <td><Link href={`/meters/${m.id}`} className="mono">{m.meter_serial || m.modem_serial}</Link>
                    {m.meter_serial && <span className="sub mono">IMEI: {m.modem_serial}</span>}</td>
                  <td>{m.model || "—"}</td><td><Status value={m.status} /></td>
                  <td className="right num"><b>{fmtM3(m.last_value)}</b></td><td className="right muted num">{fmtAgo(m.last_seen_at, lang)}</td>
                </tr>))}
              </tbody>
            </table>
          </div>
        ) : <p>{t("empty")}</p>}
      </section>
    </>
  );
}

function UsageChart({ rows, lang, unit }) {
  const w = 560, h = 220, l = 44, b = 30, top = 12, iw = w - l - 14, ih = h - b - top;
  const max = Math.max(1, ...rows.map((r) => r.used));
  const step = niceStep(max / 4), ceil = step * 4;
  const x = (i) => l + (rows.length > 1 ? (i / (rows.length - 1)) * iw : iw / 2);
  const y = (v) => top + ih - (v / ceil) * ih;
  const pts = rows.map((r, i) => `${x(i)},${y(r.used)}`).join(" ");
  const area = `M${x(0)},${top + ih} L${pts.replaceAll(" ", " L")} L${x(rows.length - 1)},${top + ih} Z`;
  const day = (d) => new Date(d).toLocaleDateString(lang === "en" ? "en-GB" : lang === "ru" ? "ru-RU" : "uz-UZ", { weekday: "short" });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={unit}>
      <defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity=".35" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}><line x1={l} x2={w - 14} y1={y(step * i)} y2={y(step * i)} stroke="var(--line)" />
          <text x={l - 8} y={y(step * i) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{+(step * i).toFixed(2)}</text></g>
      ))}
      <path d={area} fill="url(#g)" />
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />
      {rows.map((r, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(r.used)} r={i === rows.length - 1 ? 5 : 3} fill={i === rows.length - 1 ? "var(--accent)" : "var(--panel)"} stroke="var(--accent)" strokeWidth="2"><title>{`${r.used.toFixed(3)} m³`}</title></circle>
          <text x={x(i)} y={h - 9} textAnchor="middle" fontSize="11" fill="var(--muted)">{day(r.day)}</text>
        </g>
      ))}
      <text x={l} y={top - 2} fontSize="10.5" fill="var(--muted)">{unit}</text>
    </svg>
  );
}

function niceStep(raw) {
  const pow = 10 ** Math.floor(Math.log10(raw || 1));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}
