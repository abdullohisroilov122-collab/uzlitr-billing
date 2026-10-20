import { headers } from "next/headers";
import { requireUser, hasRole } from "@/lib/auth";
import { getSetting } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { vodokanalConfigured } from "@/lib/vodokanal";
import Icon from "@/components/Icon";
import Flash from "@/components/Flash";
import { SubmitButton } from "@/components/client";
import { saveProfile, saveTelegram } from "@/app/actions/settings";

export default async function SettingsPage({ searchParams }) {
  const user = await requireUser();
  const t = getT();
  const admin = hasRole(user, "admin");
  const tg = admin ? await getSetting("telegram", {}) : {};
  const host = headers().get("host");
  const base = `${host?.startsWith("localhost") ? "http" : "https"}://${host}`;

  return (
    <>
      <div className="head"><div><h1>{t("settings_title")}</h1></div></div>
      <Flash searchParams={searchParams} />

      <form action={saveProfile} className="card">
        <h2><Icon name="users" />{t("my_profile")}</h2><p>{t("my_profile_sub")}</p>
        <div className="form">
          <label>{t("full_name")}<input className="f" name="full_name" defaultValue={user.full_name} required /></label>
          <label>{t("phone")}<input className="f mono" name="phone" type="tel" defaultValue={user.phone} required /></label>
          <label>{t("client_type")}<select className="f" name="client_type" defaultValue={user.client_type}>
            <option value="individual">{t("ct_individual")}</option><option value="legal">{t("ct_legal")}</option></select></label>
          <label>{t("pinfl")}<input className="f mono" name="pinfl" inputMode="numeric" maxLength={14} defaultValue={user.pinfl ?? ""} /></label>
          <p className="full" style={{ fontSize: 12.5 }}>{t("change_password")}</p>
          <label>{t("new_password")}<input className="f" name="password" type="password" autoComplete="new-password" placeholder={t("password_rule")} /></label>
          <label>{t("confirm_password")}<input className="f" name="password2" type="password" autoComplete="new-password" /></label>
        </div>
        <div className="form-foot"><span /><SubmitButton><Icon name="check" />{t("save")}</SubmitButton></div>
      </form>

      {admin && (
        <form action={saveTelegram} className="card">
          <h2><Icon name="telegram" />{t("telegram_title")}</h2><p>{t("telegram_sub")}</p>
          <div className="form">
            <label>{t("bot_token")}<input className="f mono" name="botToken" type="password" autoComplete="off"
              placeholder={tg.botToken ? `•••••••• ${tg.botToken.slice(-4)}` : "123456:ABC-DEF…"} /></label>
            <label>{t("chat_id")}<input className="f mono" name="chatId" defaultValue={tg.chatId ?? ""} placeholder="-1001234567890" /></label>
            <label className="check full"><input type="checkbox" name="enabled" defaultChecked={!!tg.enabled} />{t("enabled")}</label>
          </div>
          <div className="form-foot">
            <SubmitButton className="btn" name="test" value="1"><Icon name="send" />{t("send_test")}</SubmitButton>
            <SubmitButton><Icon name="check" />{t("save")}</SubmitButton>
          </div>
        </form>
      )}

      {admin && (
        <section className="card">
          <h2><Icon name="link" />{t("integration_title")}</h2><p>{t("integration_sub")}</p>
          <div className="field">{t("ingest_url")} (POST)<div className="codebox">{base}/api/ingest</div></div>
          <div className="field">{t("read_url")} (GET)<div className="codebox">{base}/api/v1/readings</div></div>
          <div className="field">{t("vodokanal_url")}
            {vodokanalConfigured() ? <span className="chip dot c-ok" style={{ alignSelf: "flex-start" }}>{t("forward_active")}</span>
              : <span className="chip dot c-warn" style={{ alignSelf: "flex-start" }}>{t("not_configured")}</span>}</div>
        </section>
      )}
    </>
  );
}
