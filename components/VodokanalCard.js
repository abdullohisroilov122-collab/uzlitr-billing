import Link from "next/link";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { missingFields, buildPayload } from "@/lib/vodokanal";
import Icon from "./Icon";

// Staff view: is this meter ready for the Uztelecom API, what's missing and where to fill it in, and the exact request.
export default async function VodokanalCard({ meter, customer }) {
  const t = getT();
  const sql = await db();
  const [last] = await sql`SELECT value, measured_at FROM readings WHERE meter_id = ${meter.id} ORDER BY measured_at DESC LIMIT 1`;
  const row = {
    meter_id: meter.id, meter_serial: meter.meter_serial, modem_serial: meter.modem_serial,
    model: meter.model, manufacturer: meter.manufacturer, diameter_mm: meter.diameter_mm,
    ...(customer && { account_number: customer.account_number, inn: customer.inn, pinfl: customer.pinfl,
      cadastr_number: customer.cadastr_number, latitude: customer.latitude, longitude: customer.longitude }),
    value: last?.value ?? meter.last_value ?? 0, measured_at: last?.measured_at ?? new Date()
  };
  const edit = `/meters/${meter.id}/edit`, cust = customer ? `/customers/${customer.id}` : null;
  const WHERE = {
    serialNumber: [t("meter_serial"), edit, "vk_where_meter"], model: [t("model"), edit, "vk_where_meter"],
    manufacturer: [t("manufacturer"), "/models", "vk_where_model"], diameter: [t("diameter"), "/models", "vk_where_model"],
    personalAccount: [t("account_number"), cust, "vk_where_customer"], INN: [t("vk_pinfl_or_inn"), cust, "vk_where_customer"]
  };
  const missing = missingFields(row);
  const recommended = customer ? [
    !customer.cadastr_number && t("cadastr_number"),
    (customer.latitude == null || customer.longitude == null) && `${t("latitude")} / ${t("longitude")}`
  ].filter(Boolean) : [];

  return (
    <section className="card">
      <h2><span className={`ico ${missing.length ? "c-warn" : "c-ok"}`}><Icon name="send" /></span>{t("vk_title")}</h2>
      {missing.length || !customer ? (
          <div className="banner warn">
            <b>{t("vk_missing")}</b>
            <ul className="vk-list">
              {!customer && <li><b>{t("vk_no_customer")}</b> → <Link className="link" href="/customers">{t("customers_title")}</Link></li>}
              {missing.map((k) => {
              const [label, href, where] = WHERE[k];
              return <li key={k}><b>{label}</b> <span className="mono muted">({k})</span>{href && <> → <Link className="link" href={href}>{t(where)}</Link></>}</li>;
            })}
            </ul>
          </div>
        ) : <div className="banner ok">✓ {t("vk_ready")}</div>}
      {customer && recommended.length > 0 && <p className="muted" style={{ margin: 0 }}>{t("vk_recommended")} {recommended.join(", ")} → <Link className="link" href={cust}>{t("vk_where_customer")}</Link></p>}
      {(
        <details>
          <summary className="link" style={{ cursor: "pointer" }}>{t("vk_preview")}</summary>
          <div className="codebox" style={{ marginTop: 10 }}>{JSON.stringify(buildPayload(row), null, 2)}</div>
        </details>
      )}
    </section>
  );
}
