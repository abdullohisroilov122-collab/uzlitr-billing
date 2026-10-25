import Link from "next/link";
import { db } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import Icon from "@/components/Icon";
import MyApplications from "@/components/MyApplications";

// "Mening profilim": read-only details. Only the password can be changed here; other changes go through UZLITRPRO staff.
export default async function ProfilePage() {
  const user = await requireClient();
  const t = getT();
  const sql = await db();
  const [c] = await sql`SELECT * FROM customers WHERE id = ${user.customer_id}`;
  const row = (label, value, mono) => <div key={label}><span>{label}</span><b className={mono ? "mono" : undefined}>{value || "—"}</b></div>;
  return (
    <>
      <section className="card profile">
        <h2><span className="ico c-acc"><Icon name="user" /></span>{t("my_profile")}</h2>
        <h3><Icon name="user" size={18} />{t("personal_info")}</h3>
        <div className="kv">{row(t("full_name"), user.full_name)}{row(t("auth_login"), user.login || user.phone, true)}</div>
        <Link className="btn soft" href="/portal/settings" style={{ alignSelf: "flex-start" }}><Icon name="lock" />{t("change_password_title")}<Icon name="chevron" /></Link>
        <hr />
        <h3><Icon name="building" size={18} />{c.kind === "legal" ? t("company_info") : t("customer_info")}</h3>
        <div className="kv">
          {row(t("name"), c.name)}{row(t("phone"), c.phone, true)}
          {row(c.kind === "legal" ? t("inn") : t("pinfl"), c.kind === "legal" ? c.inn : c.pinfl, true)}
          {row(t("account_number"), c.account_number, true)}
        </div>
        <hr />
        <h3><Icon name="pin" size={18} />{t("address_info")}</h3>
        <div className="kv">
          {row(t("region"), c.region)}{row(t("district"), c.district)}{row(t("street"), c.street)}{row(t("house"), c.house)}
          {row(t("coordinates"), c.latitude != null ? `${c.latitude}, ${c.longitude}` : null, true)}
        </div>
        <p className="muted" style={{ fontSize: 13 }}>{t("profile_change_hint")}</p>
      </section>
      <MyApplications customerId={user.customer_id} />
    </>
  );
}
