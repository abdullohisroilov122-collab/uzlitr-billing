import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import Icon from "@/components/Icon";
import Flash from "@/components/Flash";
import { SubmitButton } from "@/components/client";
import { changePassword } from "@/app/actions/settings";

export default async function PortalSettings({ searchParams }) {
  const user = await requireClient();
  const t = getT();
  return (
    <>
      <div className="head"><div>
        <div className="crumbs"><Link href="/portal">{t("my_cabinet")}</Link>›<span>{t("nav_settings")}</span></div>
        <h1>{t("nav_settings")}</h1></div></div>
      <Flash searchParams={searchParams} />
      <form action={changePassword} className="card" style={{ maxWidth: 620 }}>
        <h2><span className="ico c-acc"><Icon name="lock" /></span>{t("change_password_title")}</h2>
        <p>{t("login_is", { phone: user.phone })}</p>
        <input type="hidden" name="back" value="/portal/settings" />
        <div className="form">
          <label className="full">{t("current_password")}<input className="f" name="current" type="password" autoComplete="current-password" required /></label>
          <label>{t("new_password")}<input className="f" name="password" type="password" autoComplete="new-password" required placeholder={t("password_rule")} /></label>
          <label>{t("confirm_password")}<input className="f" name="password2" type="password" autoComplete="new-password" required /></label>
        </div>
        <div className="form-foot"><span /><SubmitButton><Icon name="check" />{t("save")}</SubmitButton></div>
      </form>
    </>
  );
}
