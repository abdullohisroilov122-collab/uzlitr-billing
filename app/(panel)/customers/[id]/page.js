import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, hasRole } from "@/lib/auth";
import { getT, getLang } from "@/lib/i18n";
import { STATUS_SQL } from "@/lib/meters";
import { fmtAgo, fmtM3, fmtDate } from "@/lib/format";
import Icon from "@/components/Icon";
import Flash from "@/components/Flash";
import Status from "@/components/Status";
import CustomerForm from "@/components/CustomerForm";
import { SubmitButton, ConfirmSubmit } from "@/components/client";
import { linkMeter, unlinkMeter, savePortalAccess, deleteCustomer } from "@/app/actions/customers";

export default async function CustomerPage({ params, searchParams }) {
  const user = await requireUser();
  const t = getT(), lang = getLang();
  const id = Number(params.id);
  if (!id) notFound();
  const sql = await db();
  const [customer] = await sql`SELECT * FROM customers WHERE id = ${id}`;
  if (!customer) notFound();
  const meters = await sql`
    SELECT m.id, m.meter_serial, m.modem_serial, m.last_value, m.last_seen_at, md.name AS model, ${sql.unsafe(STATUS_SQL)} AS status
    FROM meters m LEFT JOIN models md ON md.id = m.model_id WHERE m.customer_id = ${id} ORDER BY m.id`;
  const free = await sql`SELECT id, meter_serial, modem_serial FROM meters WHERE customer_id IS NULL ORDER BY id DESC LIMIT 500`;
  const [portal] = await sql`SELECT phone, is_active, last_login_at FROM users WHERE customer_id = ${id} AND role = 'client'`;

  return (
    <>
      <div className="head">
        <div>
          <div className="crumbs"><Link href="/customers">{t("customers_title")}</Link>›<span>{customer.name}</span></div>
          <h1>{customer.name} <span className={`chip ${customer.kind === "legal" ? "c-info" : "c-acc"}`}>{t(customer.kind === "legal" ? "ct_legal" : "ct_individual")}</span></h1>
          {customer.account_number && <p>{t("account_number")}: <b className="mono">{customer.account_number}</b></p>}
        </div>
      </div>
      <Flash searchParams={searchParams} />
      <div className="grid2">
        <CustomerForm customer={customer} />
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <section className="card flush">
            <div className="card-head"><h2><span className="ico c-acc"><Icon name="drop" /></span>{t("nav_meters")} · {meters.length}</h2></div>
            {meters.length ? (
              <div className="tablewrap compact"><table>
                <tbody>{meters.map((m) => (
                  <tr key={m.id}>
                    <td><Link href={`/meters/${m.id}`}><b className="mono">{m.meter_serial || m.modem_serial}</b></Link>
                      <span className="sub">{m.model || "—"} · {fmtAgo(m.last_seen_at, lang)}</span></td>
                    <td className="right num"><b>{fmtM3(m.last_value)}</b></td>
                    <td><Status value={m.status} /></td>
                    <td className="right">
                      <form action={unlinkMeter}><input type="hidden" name="customer_id" value={id} /><input type="hidden" name="meter_id" value={m.id} />
                        <ConfirmSubmit label={t("unlink")} question={t("confirm_unlink")} confirmLabel={t("unlink")} cancelLabel={t("cancel")} /></form>
                    </td>
                  </tr>))}
                </tbody>
              </table></div>
            ) : <div className="empty">{t("no_meters_linked")}</div>}
            <form action={linkMeter} className="toolbar" style={{ padding: 16, borderTop: "1px solid var(--line)" }}>
              <input type="hidden" name="customer_id" value={id} />
              <select className="f" name="meter_id" defaultValue="" required style={{ flex: 1, minWidth: 0 }} aria-label={t("meter")}>
                <option value="" disabled>{free.length ? t("choose_meter") : t("no_free_meters")}</option>
                {free.map((m) => <option key={m.id} value={m.id}>{m.meter_serial ? `${m.meter_serial} · ${m.modem_serial}` : m.modem_serial}</option>)}
              </select>
              <SubmitButton className="btn soft"><Icon name="link" />{t("link_meter")}</SubmitButton>
            </form>
          </section>

          <form action={savePortalAccess} className="card">
            <h2><span className="ico c-ok"><Icon name="user" /></span>{t("portal_access")}</h2>
            <p>{t("portal_access_d")}</p>
            {portal && <div className="meta"><span>{t("status")}: <b>{portal.is_active ? t("on") : t("off")}</b></span><span>{t("last_login")}: <b>{fmtDate(portal.last_login_at, lang)}</b></span></div>}
            <input type="hidden" name="customer_id" value={id} />
            <div className="form">
              <label>{t("login_phone")} *<input className="f mono" name="login_phone" type="tel" defaultValue={portal?.phone ?? customer.phone ?? ""} required /></label>
              <label>{t("password")}{portal ? "" : " *"}<input className="f" name="password" type="password" autoComplete="new-password" required={!portal} />
                <span className="hint">{portal ? t("password_new_hint") : t("password_rule")}</span></label>
              <label className="check full"><input type="checkbox" name="is_active" defaultChecked={portal?.is_active ?? true} />{t("portal_enabled")}</label>
            </div>
            <div className="form-foot"><span /><SubmitButton><Icon name="check" />{portal ? t("save") : t("give_access")}</SubmitButton></div>
          </form>

          {hasRole(user, "admin") && (
            <form action={deleteCustomer} className="actions">
              <input type="hidden" name="id" value={id} />
              <ConfirmSubmit label={t("delete_customer")} question={t("confirm_delete")} confirmLabel={t("yes_delete")} cancelLabel={t("cancel")} />
            </form>
          )}
        </div>
      </div>
    </>
  );
}
