import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getT, getLang } from "@/lib/i18n";
import { STATUS_SQL } from "@/lib/meters";
import { fmtAgo, fmtDate, fmtM3 } from "@/lib/format";
import Icon from "@/components/Icon";
import Status from "@/components/Status";
import Flash from "@/components/Flash";

const PER_PAGE = 50;

export default async function MetersPage({ searchParams }) {
  await requireUser();
  const t = getT(), lang = getLang();
  const sql = await db();
  const q = (searchParams.q || "").trim();
  const status = ["active", "offline", "never"].includes(searchParams.status) ? searchParams.status : "";
  const modelId = Number(searchParams.model) || null;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const like = `%${q}%`;

  const where = sql`
    WHERE true
    ${q ? sql`AND (m.meter_serial ILIKE ${like} OR m.modem_serial ILIKE ${like} OR m.owner_name ILIKE ${like}
                   OR m.owner_phone ILIKE ${like} OR m.account_number ILIKE ${like} OR m.address ILIKE ${like})` : sql``}
    ${status ? sql`AND ${sql.unsafe(STATUS_SQL)} = ${status}` : sql``}
    ${modelId ? sql`AND m.model_id = ${modelId}` : sql``}`;
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM meters m LEFT JOIN models md ON md.id = m.model_id ${where}`;
  const rows = await sql`
    SELECT m.*, md.name AS model, ${sql.unsafe(STATUS_SQL)} AS status
    FROM meters m LEFT JOIN models md ON md.id = m.model_id ${where}
    ORDER BY m.last_seen_at DESC NULLS LAST, m.id DESC
    LIMIT ${PER_PAGE} OFFSET ${(page - 1) * PER_PAGE}`;
  const models = await sql`SELECT id, name FROM models ORDER BY name`;
  const [{ total }] = await sql`SELECT count(*)::int AS total FROM meters`;
  const pages = Math.max(1, Math.ceil(count / PER_PAGE));
  const qs = (p) => new URLSearchParams({ ...(q && { q }), ...(status && { status }), ...(modelId && { model: modelId }), page: p }).toString();

  return (
    <>
      <div className="head">
        <div><h1>{t("meters_title")}</h1><p>{t("total")}: {total}</p></div>
        <div className="actions">
          <span className="chip c-acc"><Icon name="clock" size={13} />{t("last_sync")}: {fmtDate(new Date(), lang).split(", ").pop()}</span>
          <a className="btn" href="/api/meters/export"><Icon name="down" />{t("export_csv")}</a>
          <Link className="btn primary" href="/meters/new"><Icon name="plus" />{t("add")}</Link>
        </div>
      </div>
      <Flash searchParams={searchParams} />
      <form className="toolbar" method="get">
        <label className="search"><Icon name="search" /><input name="q" defaultValue={q} placeholder={t("search")} aria-label={t("search")} /></label>
        <select className="f" name="status" defaultValue={status} aria-label={t("status")}>
          <option value="">{t("status")}: {t("all")}</option>
          <option value="active">{t("st_active")}</option><option value="offline">{t("st_offline")}</option><option value="never">{t("st_never")}</option>
        </select>
        <select className="f" name="model" defaultValue={modelId || ""} aria-label={t("model")}>
          <option value="">{t("model")}: {t("all")}</option>
          {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <button className="btn" type="submit"><Icon name="filter" />{t("filters")}</button>
      </form>

      <div className="tablewrap">
        {rows.length ? (
          <table>
            <thead><tr>
              <th>{t("meter_serial")}</th><th>{t("modem_serial")}</th><th>{t("model")}</th><th>{t("owner")}</th>
              <th className="right">{t("reading")}</th><th>{t("last_signal")}</th><th>{t("status")}</th><th className="right">{t("actions")}</th>
            </tr></thead>
            <tbody>{rows.map((m) => (
              <tr key={m.id}>
                <td>{m.meter_serial ? <b className="mono">{m.meter_serial}</b> : <span className="unset">{t("not_assigned")}</span>}</td>
                <td className="mono">{m.modem_serial}</td>
                <td style={{ whiteSpace: "nowrap" }}>{m.model || "—"}</td>
                <td>{m.owner_name ? <>{m.owner_name}<span className="sub mono">{m.owner_phone}</span></> : <span className="unset">{t("not_linked")}</span>}</td>
                <td className="right num"><b>{fmtM3(m.last_value)}</b></td>
                <td className="num muted">{fmtAgo(m.last_seen_at, lang)}</td>
                <td><Status value={m.status} /></td>
                <td><div className="rowact"><Link className="btn sm" href={`/meters/${m.id}`} title={t("view")} aria-label={t("view")}><Icon name="eye" /></Link></div></td>
              </tr>))}
            </tbody>
          </table>
        ) : <div className="empty">{t("empty")}</div>}
      </div>
      {pages > 1 && (
        <div className="pager">
          <span>{(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, count)} / {count}</span>
          <div className="actions">
            <Link className="btn sm" aria-disabled={page <= 1} href={`/meters?${qs(page - 1)}`}>{t("prev")}</Link>
            <Link className="btn sm" aria-disabled={page >= pages} href={`/meters?${qs(page + 1)}`}>{t("next")}</Link>
          </div>
        </div>
      )}
    </>
  );
}
