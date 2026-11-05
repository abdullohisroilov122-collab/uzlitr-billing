import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getT, getLang } from "@/lib/i18n";
import { fmtDate } from "@/lib/format";
import Icon from "@/components/Icon";

const ALARMS = ["lowBattery", "tamper", "magnet", "pipeLeak", "valveLeak", "reverseFlow", "sensorFault", "valveFault", "meteringFault", "flowAbnormal", "pressureAbnormal"];

function Decoded({ items, t }) {
  if (!items?.length) return <span className="muted">—</span>;
  return items.map((d, i) => {
    if (d.kind === "reading") {
      const alarms = ALARMS.filter((k) => d.status?.[k]);
      return (
        <div key={i}>
          <b className="mono">{d.serial}</b> · <b>{d.forward} m³</b>{d.meterTime && <span className="muted"> · {d.meterTime}</span>}
          {d.battery != null && <span className="muted"> · 🔋 {d.battery} V</span>}
          {d.signal != null && <span className="muted"> · 📶 {d.signal}</span>}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
            <span className={`chip ${d.status?.valve === "closed" ? "c-warn" : "c-ok"}`}>{t("udp_valve")}: {t(`udp_valve_${d.status?.valve}`)}</span>
            {alarms.map((a) => <span key={a} className="chip c-bad">{a === "tamper" ? `🔌 ${t("udp_pulse_cut")}` : a}</span>)}
            {!d.csOk && <span className="chip c-bad">CS ✗</span>}
            {d.duplicate && <span className="chip c-mut">{t("udp_duplicate")}</span>}
          </div>
        </div>
      );
    }
    return <div key={i}><span className={`chip ${d.kind === "heartbeat" ? "c-info" : "c-mut"}`}>{d.kind}</span>{d.serial && <span className="mono muted"> {d.serial}</span>}{d.error && <span className="muted"> {d.error}</span>}</div>;
  });
}

// Raw UDP packets from the modems (saved by the udp service), shown as hex until the protocol is decoded.
export default async function UdpPage() {
  await requireUser("admin");
  const t = getT(), lang = getLang();
  const sql = await db();
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM udp_packets`;
  const rows = await sql`SELECT * FROM udp_packets ORDER BY received_at DESC LIMIT 100`;
  return (
    <>
      <div className="head"><div><h1>{t("udp_title")}</h1><p>{t("udp_sub")} · {t("total")}: {count}</p></div>
        <Link className="btn" href="/udp"><Icon name="refresh" />{t("refresh")}</Link></div>
      <div className="banner token">{t("udp_address")}: <b className="mono">198.163.197.118 : 45370</b> (UDP)</div>
      <div className="tablewrap">
        {rows.length ? (
          <table>
            <thead><tr><th>{t("when")}</th><th>{t("udp_sender")}</th><th>{t("udp_size")}</th><th>{t("udp_decoded")}</th><th>HEX</th></tr></thead>
            <tbody>{rows.map((p) => (
              <tr key={p.id}>
                <td className="num muted">{fmtDate(p.received_at, lang, true, true)}</td>
                <td className="mono">{p.remote}</td>
                <td className="num">{p.size} B</td>
                <td style={{ minWidth: 260 }}><Decoded items={p.decoded} t={t} /></td>
                <td className="mono muted" style={{ maxWidth: 420, overflowWrap: "anywhere", fontSize: 11 }}>{p.hex}</td>
              </tr>))}
            </tbody>
          </table>
        ) : <div className="empty"><b>{t("udp_empty")}</b><span>{t("udp_empty_d")}</span></div>}
      </div>
    </>
  );
}
