import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getT, getLang } from "@/lib/i18n";
import { fmtDate } from "@/lib/format";
import Icon from "@/components/Icon";

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
            <thead><tr><th>{t("when")}</th><th>{t("udp_sender")}</th><th>{t("udp_size")}</th><th>HEX</th></tr></thead>
            <tbody>{rows.map((p) => (
              <tr key={p.id}>
                <td className="num muted">{fmtDate(p.received_at, lang, true, true)}</td>
                <td className="mono">{p.remote}</td>
                <td className="num">{p.size} B</td>
                <td className="mono" style={{ maxWidth: 560, overflowWrap: "anywhere", fontSize: 12 }}>{p.hex}</td>
              </tr>))}
            </tbody>
          </table>
        ) : <div className="empty"><b>{t("udp_empty")}</b><span>{t("udp_empty_d")}</span></div>}
      </div>
    </>
  );
}
