import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import Icon from "@/components/Icon";
import Flash from "@/components/Flash";
import { addressLines } from "@/components/dash";

const PER_PAGE = 50;

export default async function CustomersPage({ searchParams }) {
  await requireUser();
  const t = getT();
  const sql = await db();
  const q = (searchParams.q || "").trim();
  const kind = ["individual", "legal"].includes(searchParams.kind) ? searchParams.kind : "";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const like = `%${q}%`;
  const where = sql`WHERE true
    ${q ? sql`AND (c.name ILIKE ${like} OR c.account_number ILIKE ${like} OR c.phone ILIKE ${like} OR c.inn ILIKE ${like}
                  OR c.street ILIKE ${like} OR c.district ILIKE ${like})` : sql``}
    ${kind ? sql`AND c.kind = ${kind}` : sql``}`;
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM customers c ${where}`;
  const rows = await sql`
    SELECT c.*, (SELECT count(*)::int FROM meters m WHERE m.customer_id = c.id) AS meters,
           EXISTS (SELECT 1 FROM users u WHERE u.customer_id = c.id AND u.role = 'client' AND u.is_active) AS portal
    FROM customers c ${where} ORDER BY c.created_at DESC LIMIT ${PER_PAGE} OFFSET ${(page - 1) * PER_PAGE}`;
  const pages = Math.max(1, Math.ceil(count / PER_PAGE));
  const qs = (p) => new URLSearchParams({ ...(q && { q }), ...(kind && { kind }), page: p }).toString();

  return (
    <>
      <div className="head">
        <div><h1>{t("customers_title")}</h1><p>{t("customers_sub")} · {t("total")}: {count}</p></div>
        <Link className="btn primary" href="/customers/new"><Icon name="plus" />{t("add")}</Link>
      </div>
      <Flash searchParams={searchParams} />
      <form className="toolbar" method="get">
        <label className="search"><Icon name="search" /><input name="q" defaultValue={q} placeholder={t("customers_search")} aria-label={t("search")} /></label>
        <select className="f" name="kind" defaultValue={kind} aria-label={t("client_type")}>
          <option value="">{t("client_type")}: {t("all")}</option>
          <option value="individual">{t("ct_individual")}</option><option value="legal">{t("ct_legal")}</option>
        </select>
        <button className="btn" type="submit"><Icon name="filter" />{t("filters")}</button>
      </form>
      <div className="tablewrap">
        {rows.length ? (
          <table>
            <thead><tr><th>{t("customer")}</th><th>{t("account_number")}</th><th>{t("phone")}</th><th>{t("address")}</th>
              <th className="right">{t("meters_count")}</th><th>{t("portal")}</th><th className="right">{t("actions")}</th></tr></thead>
            <tbody>{rows.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/customers/${c.id}`}><b>{c.name}</b></Link>
                  <span className="sub">{t(c.kind === "legal" ? "ct_legal" : "ct_individual")}{c.inn ? ` · ${t("inn")} ${c.inn}` : ""}</span></td>
                <td className="mono">{c.account_number || <span className="unset">{t("none")}</span>}</td>
                <td className="mono">{c.phone || "—"}</td>
                <td style={{ maxWidth: 260 }}>{addressLines(c).join(", ") || <span className="unset">{t("no_address")}</span>}</td>
                <td className="right num"><b>{c.meters}</b></td>
                <td>{c.portal ? <span className="chip dot c-ok">{t("on")}</span> : <span className="chip dot c-mut">{t("off")}</span>}</td>
                <td><div className="rowact"><Link className="btn sm" href={`/customers/${c.id}`} aria-label={t("view")}><Icon name="eye" /></Link></div></td>
              </tr>))}
            </tbody>
          </table>
        ) : <div className="empty"><b>{q || kind ? t("nothing_found") : t("no_customers")}</b><span>{t("no_customers_hint")}</span></div>}
      </div>
      {pages > 1 && (
        <div className="pager"><span>{(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, count)} / {count}</span>
          <div className="actions">
            <Link className="btn sm" aria-disabled={page <= 1} href={`/customers?${qs(page - 1)}`}>{t("prev")}</Link>
            <Link className="btn sm" aria-disabled={page >= pages} href={`/customers?${qs(page + 1)}`}>{t("next")}</Link>
          </div></div>
      )}
    </>
  );
}
