import Link from "next/link";
import { getT } from "@/lib/i18n";
import { saveMeter } from "@/app/actions/meters";
import { SubmitButton } from "./client";
import Icon from "./Icon";

export default function MeterForm({ meter = {}, models, customers }) {
  const t = getT();
  const field = (name, label, props = {}) => (
    <label className={props.full ? "full" : undefined}>{label}{props.req ? " *" : ""}
      <input className={`f ${props.mono ? "mono" : ""}`} name={name} type={props.type || "text"} required={props.req} placeholder={props.ph}
        defaultValue={props.value ?? meter[name] ?? ""} />
    </label>
  );
  const installed = meter.installed_at ? new Date(meter.installed_at).toISOString().slice(0, 10) : "";
  return (
    <form action={saveMeter} className="card">
      <h2><span className="ico c-acc"><Icon name="drop" /></span>{meter.id ? t("edit_meter") : t("new_meter")}</h2>
      <input type="hidden" name="id" value={meter.id ?? ""} />
      <div className="form">
        {field("modem_serial", t("modem_serial"), { req: true, mono: true, ph: "10022375" })}
        {field("meter_serial", t("meter_serial"), { mono: true, ph: "24112344" })}
        <label>{t("model")}
          <select className="f" name="model_id" defaultValue={meter.model_id ?? ""}>
            <option value="">{t("choose")}</option>
            {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        {field("installed_at", t("installed_at"), { type: "date", value: installed })}
        <label className="full">{t("customer")}
          <select className="f" name="customer_id" defaultValue={meter.customer_id ?? ""}>
            <option value="">{t("not_linked")}</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.account_number ? ` · ${c.account_number}` : ""}</option>)}
          </select>
          <span className="hint">{t("customer_pick_hint")} <Link className="link" href="/customers/new">{t("new_customer")}</Link></span>
        </label>
        <label className="full">{t("notes")}<textarea className="f" name="notes" defaultValue={meter.notes ?? ""} /></label>
      </div>
      <div className="form-foot">
        <span className="muted" style={{ fontSize: 12.5 }}>{t("meter_token_hint")}</span>
        <SubmitButton><Icon name="check" />{t("save")}</SubmitButton>
      </div>
    </form>
  );
}
