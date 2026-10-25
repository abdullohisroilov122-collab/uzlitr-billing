import Link from "next/link";
import { db } from "@/lib/db";
import { getT, getLang } from "@/lib/i18n";
import { fmtDate } from "@/lib/format";
import Icon from "./Icon";

const CLS = { pending: "c-warn", approved: "c-ok", rejected: "c-bad" };

// "Mening arizalarim": the customer's requests to add meters, and the button to make one.
export default async function MyApplications({ customerId }) {
  const t = getT(), lang = getLang();
  const sql = await db();
  const apps = await sql`
    SELECT id, kind, status, modem_serial, note, created_at FROM applications
    WHERE customer_id = ${customerId} ORDER BY created_at DESC LIMIT 10`;
  return (
    <section className="card">
      <h2><span className="ico c-acc"><Icon name="inbox" /></span>{t("my_applications")}</h2>
      <p>{t("my_applications_d")}</p>
      {apps.length > 0 && (
        <div className="app-list">{apps.map((a) => (
          <div key={a.id} className="app-row">
            <div><b>{a.kind === "register" ? t("app_kind_register") : t("app_kind_add_meter")}</b>
              <span className="sub">{t("modem_serial")}: <span className="mono">{a.modem_serial}</span> · {fmtDate(a.created_at, lang, false)}</span>
              {a.note && <span className="sub">💬 {a.note}</span>}</div>
            <span className={`chip ${CLS[a.status]}`}>{t(`app_${a.status}`)}</span>
          </div>
        ))}</div>
      )}
      <Link className="btn soft" href="/portal/add-meter" style={{ alignSelf: "flex-start" }}><Icon name="plus" />{t("add_new_meter")}<Icon name="arrowRight" /></Link>
    </section>
  );
}
