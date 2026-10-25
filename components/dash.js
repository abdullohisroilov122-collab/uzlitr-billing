// Server components for the meter dashboard (admin meter page and customer portal share them).
import Link from "next/link";
import { getT, getLang, LOCALES } from "@/lib/i18n";
import { fmtDate } from "@/lib/format";
import { dailyUsage, weekComparison, readingsWithUsage, PERIODS } from "@/lib/usage";
import Icon from "./Icon";
import PeriodSelect from "./PeriodSelect";

const m3 = (v, digits = 3) =>
  v === null || v === undefined ? "—" : Number(v).toLocaleString("en-US", { maximumFractionDigits: digits }).replace(/,/g, " ");

export function addressLines(c) {
  if (!c) return [];
  return [c.region, c.district, c.street, c.house ? `${c.house}` : null].filter(Boolean);
}

export function HeroReading({ meter, href }) {
  const t = getT(), lang = getLang();
  return (
    <section className="hero">
      <div className="row">
        <div className="title"><span className="bubble"><Icon name="drop" /></span>{t("current_reading")}</div>
        {href && <Link className="go" href={href} aria-label={t("readings_history")}><Icon name="arrowRight" /></Link>}
      </div>
      <div className="value">{m3(meter.last_value)}<small>m³</small></div>
      <div className="when"><Icon name="calendar" />{meter.last_seen_at ? fmtDate(meter.last_seen_at, lang, true, true) : "—"}</div>
    </section>
  );
}

export async function WeekCard({ meterIds }) {
  const t = getT(), lang = getLang();
  const week = await weekComparison(meterIds);
  const max = Math.max(...week.days.map((d) => d.used), 0.001);
  const up = week.change !== null && week.change > 0;
  return (
    <section className="card">
      <h2><span className="ico c-ok"><Icon name="barChart" /></span>{t("daily_usage")} / {t("last_7_days")}</h2>
      <div className="week">
        <div style={{ display: "flex", flexDirection: "column", gap: 10, justifyContent: "center" }}>
          <div className="total">{m3(week.total)}<small>m³</small></div>
          {week.change !== null && (
            <div className="actions" style={{ gap: 8 }}>
              <span className={`trend ${up ? "c-bad" : "c-ok"}`}><Icon name={up ? "trendUp" : "trendDown"} />{up ? "+" : ""}{week.change}%</span>
              <span className="muted" style={{ fontSize: 12.5 }}>{t("vs_last_week")}</span>
            </div>
          )}
        </div>
        <div className="bars7" aria-label={t("daily_usage")}>
          {week.days.map((d) => (
            <div className="b" key={String(d.day)}>
              <b>{m3(d.used, 2)}</b>
              <div className="bar" style={{ height: `${Math.max(4, (d.used / max) * 84)}px` }} title={`${m3(d.used)} m³`} />
              <span>{weekday(d.day, lang)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export async function UsageCurveCard({ meterIds, period, periodHref }) {
  const t = getT(), lang = getLang();
  const rows = await dailyUsage(meterIds, period);
  return (
    <section className="card chart">
      <div className="card-head">
        <h2><span className="ico c-acc"><Icon name="chart" /></span>{t("usage_chart")}</h2>
        <PeriodSelect value={period} label={t("period")}
          options={PERIODS.map((p) => ({ value: p, label: t("last_n_days", { n: p }), href: periodHref(p) }))} />
      </div>
      <SmoothChart rows={rows} lang={lang} unit={t("usage_unit")} />
    </section>
  );
}

export async function RecentReadings({ meterId, allHref }) {
  const t = getT(), lang = getLang();
  const rows = await readingsWithUsage(meterId, { limit: 6 });
  return (
    <section className="card flush">
      <div className="card-head">
        <h2><span className="ico c-acc"><Icon name="history" /></span>{t("recent_readings")}</h2>
        <Link className="link" href={allHref}>{t("all")}<Icon name="arrowRight" /></Link>
      </div>
      {rows.length ? (
        <div className="tablewrap compact">
          <table>
            <thead><tr><th>{t("date")}</th><th>{t("reading")}</th><th>{t("usage")}</th><th /></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td className="num"><span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><span style={{ color: "var(--accent)", display: "inline-flex" }}><Icon name="calendar" size={16} /></span>{fmtDate(r.measured_at, lang, false)}</span></td>
                <td className="num"><b>{m3(r.value)} m³</b></td>
                <td className="num">{r.used === null ? "—" : `${m3(r.used)} m³`}</td>
                <td className="right"><Link href={allHref} className="muted" aria-label={t("view")}><Icon name="chevron" size={16} /></Link></td>
              </tr>))}
            </tbody>
          </table>
        </div>
      ) : <EmptyReadings label={t("no_readings_yet")} head={[t("date"), t("reading")]} />}
    </section>
  );
}

export function EmptyReadings({ label, head }) {
  return (
    <>
      {head && <div className="empty-head">{head.map((h) => <span key={h}>{h}</span>)}</div>}
      <div className="empty"><span className="empty-icon"><Icon name="inbox" size={34} /></span><span>{label}</span></div>
    </>
  );
}

export function InfoCard({ customer, meter }) {
  const t = getT();
  const rows = [
    ["building", t("name"), customer?.name],
    ["phone", t("phone"), customer?.phone],
    ["doc", customer?.kind === "legal" ? t("inn") : t("pinfl"), customer?.kind === "legal" ? customer?.inn : customer?.pinfl],
    ["hash", t("account_number"), customer?.account_number],
    ["gauge", t("meter_serial"), meter.meter_serial],
    ["wifi", t("modem_serial"), meter.modem_serial],
    ["chip", t("model"), meter.model]
  ];
  return (
    <section className="card">
      <h2><span className="ico c-acc"><Icon name="building" /></span>{customer?.kind === "legal" ? t("company_info") : t("customer_info")}</h2>
      <div className="info">
        {rows.map(([icon, label, value]) => (
          <div key={label}><Icon name={icon} /><span>{label}</span><b className={/serial|account/.test(label) ? "mono" : undefined}>{value || "—"}</b></div>
        ))}
      </div>
    </section>
  );
}

export function AddressCard({ customer }) {
  const t = getT();
  const lines = addressLines(customer);
  const hasPoint = customer?.latitude != null && customer?.longitude != null;
  const lat = Number(customer?.latitude), lng = Number(customer?.longitude);
  const mapHref = hasPoint
    ? `https://yandex.uz/maps/?pt=${lng},${lat}&z=16&l=map`
    : lines.length ? `https://yandex.uz/maps/?text=${encodeURIComponent(lines.join(", "))}` : null;
  return (
    <section className="card">
      <h2><span className="ico c-red"><Icon name="pin" /></span>{t("address")}</h2>
      <div className="addr-lines">
        {lines.length ? lines.map((l, i) => <span key={l}>{i === lines.length - 1 && customer?.house === l ? `${t("house")}: ${l}` : l}</span>)
          : <span className="muted">{t("no_address")}</span>}
      </div>
      {hasPoint
        ? <iframe className="addr-map" title={t("address")} loading="lazy" referrerPolicy="no-referrer"
            src={`https://yandex.uz/map-widget/v1/?ll=${lng},${lat}&z=16&pt=${lng},${lat},pm2rdm&lang=uz_UZ`} />
        : <div className="addr-map ph"><Icon name="map" size={30} /><span>{t("no_map_point")}</span></div>}
      {mapHref && <a className="btn soft" href={mapHref} target="_blank" rel="noopener noreferrer" style={{ alignSelf: "flex-start" }}><Icon name="pin" />{t("show_on_map")}<Icon name="arrowRight" /></a>}
    </section>
  );
}

// The whole SWEM-style meter dashboard.
export function MeterDashboard({ meter, customer, period, readingsHref, periodHref }) {
  // Three columns on wide screens; on phones the cards stack in SWEM's order (o1…o6).
  return (
    <div className="dash">
      <div className="col">
        <div className="o1"><HeroReading meter={meter} href={readingsHref} /></div>
        <div className="o3"><RecentReadings meterId={meter.id} allHref={readingsHref} /></div>
      </div>
      <div className="col">
        <div className="o2"><WeekCard meterIds={[meter.id]} /></div>
        <div className="o4"><UsageCurveCard meterIds={[meter.id]} period={period} periodHref={periodHref} /></div>
      </div>
      <div className="col">
        <div className="o5"><InfoCard customer={customer} meter={meter} /></div>
        <div className="o6"><AddressCard customer={customer} /></div>
      </div>
    </div>
  );
}

function weekday(day, lang) {
  return new Date(day).toLocaleDateString(LOCALES[lang] || "uz-UZ", { weekday: "short", timeZone: "UTC" }).replace(".", "");
}

// Smooth area chart (monotone cubic, so the curve never overshoots below zero).
export function SmoothChart({ rows, lang, unit }) {
  const w = 600, h = 250, l = 46, r = 16, top = 18, b = 32, iw = w - l - r, ih = h - top - b;
  const max = Math.max(...rows.map((d) => d.used), 0);
  const step = niceStep((max || 1) / 4), ceil = step * 4;
  const xs = rows.map((_, i) => l + (rows.length > 1 ? (i / (rows.length - 1)) * iw : iw / 2));
  const ys = rows.map((d) => top + ih - (d.used / ceil) * ih);
  const line = monotonePath(xs, ys);
  const area = rows.length ? `${line} L${xs[xs.length - 1]},${top + ih} L${xs[0]},${top + ih} Z` : "";
  const every = Math.ceil(rows.length / 8);
  const label = (d) => rows.length <= 7
    ? new Date(d).toLocaleDateString(LOCALES[lang] || "uz-UZ", { weekday: "short", timeZone: "UTC" }).replace(".", "")
    : new Date(d).toLocaleDateString(LOCALES[lang] || "uz-UZ", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
  const fmt = (v) => (+v.toFixed(3)).toString();
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={unit}>
      <defs>
        <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--accent-2)" stopOpacity=".28" /><stop offset="1" stopColor="var(--accent-2)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((i) => {
        const y = top + ih - (i / 4) * ih;
        return (<g key={i}><line x1={l} x2={w - r} y1={y} y2={y} stroke="var(--line)" strokeDasharray={i ? "3 4" : undefined} />
          <text x={l - 10} y={y + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{fmt(step * i)}</text></g>);
      })}
      <path d={area} fill="url(#area)" />
      <path d={line} fill="none" stroke="var(--accent-2)" strokeWidth="2.6" strokeLinecap="round" />
      {rows.map((d, i) => (
        <g key={i}>
          {rows.length <= 31 && <circle cx={xs[i]} cy={ys[i]} r={i === rows.length - 1 ? 5 : 3.5} fill={i === rows.length - 1 ? "var(--accent-2)" : "var(--panel)"} stroke="var(--accent-2)" strokeWidth="2"><title>{`${fmt(d.used)} m³`}</title></circle>}
          {(i % every === 0 || i === rows.length - 1) && <text x={xs[i]} y={h - 10} textAnchor="middle" fontSize="11" fill="var(--muted)">{label(d.day)}</text>}
        </g>
      ))}
      <text x={l} y={11} fontSize="10.5" fill="var(--muted)">{unit}</text>
    </svg>
  );
}

function monotonePath(xs, ys) {
  const n = xs.length;
  if (!n) return "";
  if (n < 3) return xs.map((x, i) => `${i ? "L" : "M"}${x},${ys[i]}`).join(" ");
  const dx = [], m = [];
  for (let i = 0; i < n - 1; i++) { dx.push(xs[i + 1] - xs[i]); m.push((ys[i + 1] - ys[i]) / dx[i]); }
  const tg = [m[0]];
  for (let i = 1; i < n - 1; i++) tg.push(m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]));
  tg.push(m[n - 2]);
  let d = `M${xs[0]},${ys[0]}`;
  for (let i = 0; i < n - 1; i++) {
    const c = dx[i] / 3;
    d += ` C${xs[i] + c},${ys[i] + c * tg[i]} ${xs[i + 1] - c},${ys[i + 1] - c * tg[i + 1]} ${xs[i + 1]},${ys[i + 1]}`;
  }
  return d;
}

export function niceStep(raw) {
  const pow = 10 ** Math.floor(Math.log10(raw || 1));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}
