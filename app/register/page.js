import Link from "next/link";
import { getT } from "@/lib/i18n";
import Icon from "@/components/Icon";
import { REGIONS } from "@/components/CustomerForm";
import RegisterWizard from "./RegisterWizard";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  const t = getT();
  const keys = ["modem", "modem_hint", "check", "checking", "modem_found", "who", "individual", "legal", "company_name", "full_name",
    "phone", "inn", "pinfl", "region", "district", "street", "house", "cadastr_number", "back", "next", "login_will_be", "password", "password2",
    "password_rule", "submit", "sending", "done_title", "done_text", "your_login", "to_login", "step_of", "error",
    "modem_ok", "modem_not_found", "modem_taken", "modem_pending", "modem_invalid", "modem_rate", "modem_error", "rate", "required",
    "bad_inn", "bad_pinfl", "password_mismatch", "phone_taken"];
  const L = Object.fromEntries(keys.map((k) => [k, t(`reg_${k}`)]));
  return (
    <div className="auth-page plain">
      <main className="auth-card reg-card">
        <div className="reg-head">
          <img src="/brand/uzlitrpro-logo.png" alt="UZLITRPRO" width="150" height="69" />
          <Link className="link" href="/login"><Icon name="arrowLeft" />{t("reg_to_login_page")}</Link>
        </div>
        <h1>{t("register_meter")}</h1>
        <p className="auth-sub" style={{ textAlign: "left" }}>{t("reg_intro")}</p>
        <RegisterWizard L={L} regions={REGIONS} />
      </main>
    </div>
  );
}
