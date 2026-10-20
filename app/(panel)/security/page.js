import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { INGEST_PER_MINUTE, LOGIN_MAX_FAILURES, LOGIN_LOCK_MINUTES } from "@/lib/ratelimit";
import { SESSION_HOURS } from "@/lib/session";
import Icon from "@/components/Icon";

export default async function SecurityPage() {
  await requireUser("admin");
  const t = getT();
  const sql = await db();
  const [{ failed }] = await sql`SELECT count(*)::int AS failed FROM login_attempts WHERE NOT success AND created_at > now() - interval '24 hours'`;
  const sessionOk = (process.env.SESSION_SECRET || "").length >= 32;
  const items = [
    { icon: "alert", key: "sec_rate", vars: { n: INGEST_PER_MINUTE }, on: true },
    { icon: "lock", key: "sec_brute", vars: { n: LOGIN_MAX_FAILURES, min: LOGIN_LOCK_MINUTES }, on: true },
    { icon: "shield", key: "sec_cors", on: true },
    { icon: "check", key: "sec_headers", on: true },
    { icon: "key", key: "sec_session", vars: { h: SESSION_HOURS }, on: sessionOk },
    { icon: "key", key: "sec_tokens", on: true },
    { icon: "lock", key: "sec_passwords", on: true },
    { icon: "log", key: "sec_audit", on: true }
  ];
  const allOn = items.every((i) => i.on);
  return (
    <>
      <div className="head"><div><h1>{t("security_title")}</h1><p>{t("security_sub")}</p></div></div>
      <div className={`banner ${allOn ? "ok" : "warn"}`}>{allOn ? t("sec_all_ok") : t("sec_some_off")}</div>
      <div className="kpis"><div className="kpi"><div className="row"><div className="ico c-warn"><Icon name="lock" /></div></div>
        <strong>{failed}</strong><span>{t("sec_failed_24h")}</span></div></div>
      <div className="sec-list">{items.map((i) => (
        <div className="sec-item" key={i.key}>
          <div className={`ico ${i.on ? "c-ok" : "c-bad"}`}><Icon name={i.icon} /></div>
          <div><b>{t(i.key)}</b><span>{t(`${i.key}_d`, i.vars)}</span></div>
          <span className={`chip dot ${i.on ? "c-ok" : "c-bad"}`}>{i.on ? t("on") : t("off")}</span>
        </div>))}
      </div>
    </>
  );
}
