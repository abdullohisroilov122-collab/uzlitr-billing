import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getT, getLang } from "@/lib/i18n";
import { fmtDate } from "@/lib/format";
import Icon from "@/components/Icon";
import { ConfirmSubmit } from "@/components/client";
import { revokeToken } from "@/app/actions/tokens";
import CreateToken from "./CreateToken";

export default async function TokensPage({ searchParams }) {
  await requireUser("admin");
  const t = getT(), lang = getLang();
  const kind = searchParams.tab === "meter" ? "meter" : "user";
  const state = ["active", "revoked"].includes(searchParams.state) ? searchParams.state : "";
  const sql = await db();
  const tokens = await sql`
    SELECT tk.*, m.modem_serial, m.meter_serial, u.full_name AS creator
    FROM tokens tk LEFT JOIN meters m ON m.id = tk.meter_id LEFT JOIN users u ON u.id = tk.created_by
    WHERE tk.kind = ${kind} ${state ? sql`AND tk.is_active = ${state === "active"}` : sql``}
    ORDER BY tk.created_at DESC`;
  const meters = kind === "meter"
    ? (await sql`SELECT id, modem_serial, meter_serial FROM meters ORDER BY id DESC LIMIT 1000`)
        .map((m) => ({ id: m.id, label: m.meter_serial ? `${m.meter_serial} · ${m.modem_serial}` : m.modem_serial }))
    : [];
  const tab = (k, label) => <Link href={`/tokens?tab=${k}`} aria-current={kind === k ? "page" : undefined}>{label}</Link>;
  const filter = (s, label) => <Link href={`/tokens?tab=${kind}${s ? `&state=${s}` : ""}`} aria-current={state === s ? "page" : undefined}>{label}</Link>;

  return (
    <>
      <div className="head">
        <div><h1>{t("tokens_title")}</h1><p>{t("total")}: {tokens.length}</p></div>
        <Link className="btn" href={`/tokens?tab=${kind}`}><Icon name="refresh" />{t("refresh")}</Link>
      </div>
      <nav className="tabs">{tab("user", t("user_tokens"))}{tab("meter", t("meter_tokens"))}</nav>
      <CreateToken kind={kind} meters={meters} labels={{
        title: t("new_token"), help: t(kind === "meter" ? "token_meter_help" : "token_user_help"),
        shownOnce: t("token_shown_once"), copy: t("copy"), copied: t("copied"), required: t("required"),
        meter: t("meter"), choose: t("choose"), name: t("name"), scopes: t("scopes"),
        scope_ingest: t("scope_ingest"), scope_read: t("scope_read"), create: t("add")
      }} />
      <nav className="tabs">{filter("", t("all"))}{filter("active", t("active"))}{filter("revoked", t("revoked"))}</nav>
      <div className="tablewrap">
        {tokens.length ? (
          <table>
            <thead><tr>
              <th>{t("token")}</th><th>{t("status")}</th><th>{kind === "meter" ? t("meter") : t("name")}</th>
              <th>{kind === "meter" ? t("modem_serial") : t("scopes")}</th><th>{t("last_used")}</th><th>{t("created_at")}</th><th className="right">{t("actions")}</th>
            </tr></thead>
            <tbody>{tokens.map((tk) => (
              <tr key={tk.id}>
                <td className="mono">{tk.token_prefix}…</td>
                <td>{tk.is_active ? <span className="chip dot c-ok">{t("active")}</span> : <span className="chip dot c-mut">{t("revoked")}</span>}</td>
                <td>{kind === "meter" ? (tk.meter_serial ? <span className="mono">{tk.meter_serial}</span> : <span className="unset">{t("not_assigned")}</span>) : <b>{tk.name}</b>}
                  {tk.creator && <span className="sub">{tk.creator}</span>}</td>
                <td>{kind === "meter" ? <span className="mono">{tk.modem_serial}</span>
                  : tk.scopes.map((s) => <span key={s} className="chip c-info" style={{ marginRight: 4 }}>{t(`scope_${s}`)}</span>)}</td>
                <td className="num muted">{fmtDate(tk.last_used_at, lang)}</td>
                <td className="num muted">{fmtDate(tk.created_at, lang, false)}</td>
                <td><div className="rowact">{tk.is_active && (
                  <form action={revokeToken}><input type="hidden" name="id" value={tk.id} />
                    <ConfirmSubmit label={t("revoke")} question={t("confirm_delete")} confirmLabel={t("revoke")} cancelLabel={t("cancel")} /></form>
                )}</div></td>
              </tr>))}
            </tbody>
          </table>
        ) : <div className="empty">{t("empty")}</div>}
      </div>
    </>
  );
}
