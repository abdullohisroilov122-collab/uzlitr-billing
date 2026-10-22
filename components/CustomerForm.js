import Link from "next/link";
import { getT } from "@/lib/i18n";
import { saveCustomer } from "@/app/actions/customers";
import { SubmitButton } from "./client";
import Icon from "./Icon";

export const REGIONS = [
  "Toshkent shahri", "Toshkent viloyati", "Andijon viloyati", "Buxoro viloyati", "Farg'ona viloyati", "Jizzax viloyati",
  "Xorazm viloyati", "Namangan viloyati", "Navoiy viloyati", "Qashqadaryo viloyati", "Qoraqalpog'iston Respublikasi",
  "Samarqand viloyati", "Sirdaryo viloyati", "Surxondaryo viloyati"
];

export default function CustomerForm({ customer = {} }) {
  const t = getT();
  const f = (name, label, props = {}) => (
    <label className={props.full ? "full" : undefined}>{label}{props.req ? " *" : ""}
      <input className={`f ${props.mono ? "mono" : ""}`} name={name} defaultValue={customer[name] ?? ""} required={props.req}
        placeholder={props.ph} inputMode={props.inputMode} maxLength={props.max} list={props.list} />
      {props.hint && <span className="hint">{props.hint}</span>}
    </label>
  );
  return (
    <form action={saveCustomer} className="card">
      <h2><span className="ico c-acc"><Icon name="building" /></span>{customer.id ? t("edit_customer") : t("new_customer")}</h2>
      <input type="hidden" name="id" value={customer.id ?? ""} />
      <div className="form">
        <label>{t("client_type")}
          <select className="f" name="kind" defaultValue={customer.kind ?? "individual"}>
            <option value="individual">{t("ct_individual")}</option><option value="legal">{t("ct_legal")}</option>
          </select>
        </label>
        {f("name", t("customer_name"), { req: true, ph: "Aminovs company" })}
        {f("account_number", t("account_number"), { mono: true, ph: "92629273835", hint: t("account_hint") })}
        {f("phone", t("phone"), { mono: true, ph: "+998 93 381 82 67" })}
        {f("inn", t("inn"), { mono: true, inputMode: "numeric", max: 9, ph: "305081846" })}
        {f("pinfl", t("pinfl"), { mono: true, inputMode: "numeric", max: 14 })}
        <h3>{t("address")}</h3>
        {f("region", t("region"), { list: "regions" })}
        {f("district", t("district"), { ph: "Yangihayot tumani" })}
        {f("street", t("street"), { ph: "Xushnud ko'chasi" })}
        {f("house", t("house"), { ph: "18" })}
        {f("latitude", t("latitude"), { mono: true, ph: "41.2995", hint: t("coords_hint") })}
        {f("longitude", t("longitude"), { mono: true, ph: "69.2401" })}
        <datalist id="regions">{REGIONS.map((r) => <option key={r} value={r} />)}</datalist>
        <label className="full">{t("notes")}<textarea className="f" name="notes" defaultValue={customer.notes ?? ""} /></label>
      </div>
      <div className="form-foot">
        <Link className="btn" href={customer.id ? `/customers/${customer.id}` : "/customers"}>{t("cancel")}</Link>
        <SubmitButton><Icon name="check" />{t("save")}</SubmitButton>
      </div>
    </form>
  );
}
