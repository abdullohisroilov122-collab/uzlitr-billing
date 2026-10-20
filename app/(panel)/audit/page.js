import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getT, getLang } from "@/lib/i18n";
import { fmtDate } from "@/lib/format";
import Icon from "@/components/Icon";

const PER_PAGE = 50;
const ACTION_CLS = { create: "c-ok", update: "c-info", delete: "c-bad", revoke: "c-bad", login: "c-acc", forward: "c-warn" };

export default async function AuditPage({ searchParams }) {
  await requireUser("admin");
  const t = getT(), lang = getLang();
  const sql = await db();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const entity = (searchParams.entity || "").replace(/[^a-z]/g, "");
  const where = entity ? sql`WHERE a.entity = ${entity}` : sql``;
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM audit_logs a ${where}`;
  const rows = await sql`
    SELECT a.*, u.full_name, u.phone FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id ${where}
    ORDER BY a.created_at DESC LIMIT ${PER_PAGE} OFFSET ${(page - 1) * PER_PAGE}`;
  const pages = Math.max(1, Math.ceil(count / PER_PAGE));
  const entities = ["", "meter", "user", "token", "model", "readings", "settings"];
  const link = (p, e = entity) => `/audit?${new URLSearchParams({ ...(e && { entity: e }), page: p })}`;

  return (
    <>
      <div className="head"><div><h1>{t("audit_title")}</h1><p>{t("audit_sub")} · {t("total")}: {count}</p></div>
        <Link className="btn" href={link(1)}><Icon name="refresh" />{t("refresh")}</Link></div>
      <nav className="tabs">{entities.map((e) => <Link key={e} href={link(1, e)} aria-current={entity === e ? "page" : undefined}>{e || t("all")}</Link>)}</nav>
      <div className="tablewrap">
        {rows.length ? (
          <table>
            <thead><tr><th>{t("when")}</th><th>{t("who")}</th><th>{t("action")}</th><th>{t("entity")}</th><th>{t("details")}</th><th>IP</th></tr></thead>
            <tbody>{rows.map((a) => (
              <tr key={a.id}>
                <td className="num muted">{fmtDate(a.created_at, lang)}</td>
                <td>{a.full_name ? <>{a.full_name}<span className="sub mono">{a.phone}</span></> : <span className="unset">{t("system")}</span>}</td>
                <td><span className={`chip ${ACTION_CLS[a.action] || "c-mut"}`}>{a.action}</span></td>
                <td className="mono">{a.entity}{a.entity_id ? ` #${a.entity_id}` : ""}</td>
                <td className="mono muted" style={{ maxWidth: 340, overflowWrap: "anywhere" }}>{a.details ? JSON.stringify(a.details) : "—"}</td>
                <td className="mono muted">{a.ip || "—"}</td>
              </tr>))}
            </tbody>
          </table>
        ) : <div className="empty">{t("empty")}</div>}
      </div>
      {pages > 1 && (
        <div className="pager"><span>{page} / {pages}</span>
          <div className="actions">
            <Link className="btn sm" aria-disabled={page <= 1} href={link(page - 1)}>{t("prev")}</Link>
            <Link className="btn sm" aria-disabled={page >= pages} href={link(page + 1)}>{t("next")}</Link>
          </div></div>
      )}
    </>
  );
}
