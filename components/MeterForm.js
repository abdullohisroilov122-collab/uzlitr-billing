import { getT } from "@/lib/i18n";
import { saveMeter } from "@/app/actions/meters";
import { SubmitButton } from "./client";
import Icon from "./Icon";

export default function MeterForm({ meter = {}, models }) {
  const t = getT();
  const field = (name, label, props = {}) => (
    <label className={props.full ? "full" : undefined}>{label}{props.req ? " *" : ""}
      <input className={`f ${props.mono ? "mono" : ""}`} name={name} defaultValue={meter[name] ?? ""} required={props.req} placeholder={props.ph} />
    </label>
  );
  return (
    <form action={saveMeter} className="card">
      <h2><Icon name="drop" />{meter.id ? t("edit_meter") : t("new_meter")}</h2>
      <input type="hidden" name="id" value={meter.id ?? ""} />
      <div className="form">
        {field("modem_serial", t("modem_serial"), { req: true, mono: true, ph: "10911262535000" })}
        {field("meter_serial", t("meter_serial"), { mono: true, ph: "2025006995" })}
        <label>{t("model")}
          <select className="f" name="model_id" defaultValue={meter.model_id ?? ""}>
            <option value="">{t("choose")}</option>
            {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        {field("account_number", t("account_number"), { mono: true })}
        {field("owner_name", t("owner_name"))}
        {field("owner_phone", t("owner_phone"), { mono: true, ph: "+998 90 123 45 67" })}
        {field("address", t("address"), { full: true })}
        <label className="full">{t("notes")}<textarea className="f" name="notes" defaultValue={meter.notes ?? ""} /></label>
      </div>
      <div className="form-foot"><span className="muted" style={{ fontSize: 12.5 }}>{t("meter_token_hint")}</span>
        <SubmitButton><Icon name="check" />{t("save")}</SubmitButton></div>
    </form>
  );
}
