import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser, hasRole, ROLES } from "@/lib/auth";
import { getT, getLang } from "@/lib/i18n";
import { fmtDate } from "@/lib/format";
import Icon from "@/components/Icon";
import Flash from "@/components/Flash";
import { SubmitButton, ConfirmSubmit } from "@/components/client";
import { saveUser, deleteUser } from "@/app/actions/users";

const ROLE_CLS = { superadmin: "c-acc", admin: "c-info", operator: "c-mut" };

export default async function UsersPage({ searchParams }) {
  const me = await requireUser("admin");
  const t = getT(), lang = getLang();
  const sql = await db();
  const q = (searchParams.q || "").trim();
  const role = ROLES.includes(searchParams.role) ? searchParams.role : "";
  const users = await sql`
    SELECT id, full_name, phone, role, client_type, pinfl, is_active, last_login_at, created_at FROM users
    WHERE true ${q ? sql`AND (full_name ILIKE ${"%" + q + "%"} OR phone ILIKE ${"%" + q + "%"})` : sql``}
      ${role ? sql`AND role = ${role}` : sql``}
    ORDER BY created_at`;
  const editing = searchParams.edit === "new" ? {} : users.find((u) => String(u.id) === searchParams.edit);
  const canManage = (u) => u.role === "operator" || hasRole(me, "superadmin");
  const roles = hasRole(me, "superadmin") ? ROLES : ["operator"];

  return (
    <>
      <div className="head">
        <div><h1>{t("users_title")}</h1><p>{t("total")}: {users.length}</p></div>
        <div className="actions"><Link className="btn primary" href="/users?edit=new"><Icon name="plus" />{t("add")}</Link></div>
      </div>
      <Flash searchParams={searchParams} />

      {editing && (
        <form action={saveUser} className="card">
          <h2><Icon name="users" />{editing.id ? t("edit_user") : t("new_user")}</h2>
          <input type="hidden" name="id" value={editing.id ?? ""} />
          <div className="form">
            <label>{t("full_name")} *<input className="f" name="full_name" defaultValue={editing.full_name ?? ""} required /></label>
            <label>{t("phone")} *<input className="f mono" name="phone" type="tel" defaultValue={editing.phone ?? ""} placeholder="+998 90 123 45 67" required /></label>
            <label>{t("role")}<select className="f" name="role" defaultValue={editing.role ?? "operator"}>
              {roles.map((r) => <option key={r} value={r}>{t(`role_${r}`)}</option>)}</select></label>
            <label>{t("client_type")}<select className="f" name="client_type" defaultValue={editing.client_type ?? "individual"}>
              <option value="individual">{t("ct_individual")}</option><option value="legal">{t("ct_legal")}</option></select></label>
            <label>{t("pinfl")}<input className="f mono" name="pinfl" inputMode="numeric" maxLength={14} defaultValue={editing.pinfl ?? ""} /></label>
            <label>{t("password")}{editing.id ? "" : " *"}<input className="f" name="password" type="password" autoComplete="new-password" required={!editing.id} />
              <span className="hint">{editing.id ? t("password_new_hint") : t("password_rule")}</span></label>
            <label className="check full"><input type="checkbox" name="is_active" defaultChecked={editing.is_active ?? true} />{t("active")}</label>
          </div>
          <div className="form-foot"><Link className="btn" href="/users">{t("cancel")}</Link><SubmitButton><Icon name="check" />{t("save")}</SubmitButton></div>
        </form>
      )}

      <form className="toolbar" method="get">
        <label className="search"><Icon name="search" /><input name="q" defaultValue={q} placeholder={t("search")} aria-label={t("search")} /></label>
        <select className="f" name="role" defaultValue={role} aria-label={t("role")}>
          <option value="">{t("role")}: {t("all")}</option>
          {ROLES.map((r) => <option key={r} value={r}>{t(`role_${r}`)}</option>)}
        </select>
        <button className="btn" type="submit"><Icon name="filter" />{t("filters")}</button>
      </form>

      <div className="tablewrap">
        <table>
          <thead><tr><th>{t("full_name")}</th><th>{t("phone")}</th><th>{t("role")}</th><th>{t("status")}</th><th>{t("last_login")}</th><th>{t("created_at")}</th><th className="right">{t("actions")}</th></tr></thead>
          <tbody>{users.map((u) => (
            <tr key={u.id}>
              <td><b>{u.full_name}</b><span className="sub">{t(u.client_type === "legal" ? "ct_legal" : "ct_individual")}</span></td>
              <td className="mono">{u.phone}</td>
              <td><span className={`chip ${ROLE_CLS[u.role]}`}>{t(`role_${u.role}`)}</span></td>
              <td>{u.is_active ? <span className="chip dot c-ok">{t("active")}</span> : <span className="chip dot c-bad">{t("blocked")}</span>}</td>
              <td className="num muted">{fmtDate(u.last_login_at, lang)}</td>
              <td className="num muted">{fmtDate(u.created_at, lang, false)}</td>
              <td><div className="rowact">
                {canManage(u) && <Link className="btn sm" href={`/users?edit=${u.id}`}><Icon name="edit" />{t("edit")}</Link>}
                {canManage(u) && u.id !== me.id && (
                  <form action={deleteUser}><input type="hidden" name="id" value={u.id} />
                    <ConfirmSubmit label={t("delete")} question={t("confirm_delete")} confirmLabel={t("yes_delete")} cancelLabel={t("cancel")} /></form>
                )}
              </div></td>
            </tr>))}
          </tbody>
        </table>
      </div>
    </>
  );
}
