import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { LOGIN_LOCK_MINUTES } from "@/lib/ratelimit";
import LangSwitch from "@/components/LangSwitch";
import Icon from "@/components/Icon";
import LoginForm from "./LoginForm";
import LampScene from "./LampScene";

export const dynamic = "force-dynamic";

// One sign-in page for everyone. Customers see the SWEM-style card; ?staff=1 shows the pull-cord lamp for staff.
// Staff can also sign in from the customer card with their phone number.
export default async function LoginPage({ searchParams }) {
  const user = await currentUser().catch(() => null);
  if (user) redirect(user.role === "client" ? "/portal" : "/");
  const t = getT();
  const setup = { setup_db: t("setup_db"), setup_db_conn: t("setup_db_conn"), setup_secret: t("setup_secret"), setup_admin: t("setup_admin") };
  if (searchParams?.staff) return (
    <div className="lamp-root">
      <div className="lamp-lang"><LangSwitch /></div>
      <LampScene labels={{ hint: t("lamp_hint"), on: t("lamp_on"), off: t("lamp_off"), soundOn: t("sound_on"), soundOff: t("sound_off") }}>
        <div className="login">
          <div className="logo"><img src="/brand/uzlitrpro-logo.png" alt="UZLITRPRO" width="220" height="101" /></div>
          <p>{t("staff_login_sub")}</p>
          <LoginForm door="staff" labels={{
            phone: t("phone"), password: t("password"), submit: t("login_btn"),
            bad: t("login_bad"), locked: t("login_locked", { min: LOGIN_LOCK_MINUTES }), staff_only: t("staff_only"), ...setup
          }} />
          <Link className="link lamp-back" href="/login"><Icon name="arrowLeft" />{t("customer_login_link")}</Link>
        </div>
      </LampScene>
    </div>
  );
  return (
    <div className="auth-page">
      <header className="auth-banner">
        <div className="auth-banner-inner">
          <div className="auth-banner-top">
            <span className="auth-pill"><Icon name="drop" size={16} />UZLITRPRO</span>
            <LangSwitch align="right" />
          </div>
          <h1>{t("auth_banner")}</h1>
        </div>
      </header>
      <main className="auth-card">
        <img className="auth-logo" src="/brand/uzlitrpro-logo.png" alt="UZLITRPRO" width="200" height="92" />
        <h2>{t("login_title")}</h2>
        <p className="auth-sub">{t("auth_sub")}</p>
        <LoginForm door="customer" labels={{
          login: t("auth_login"), loginPh: t("auth_login_ph"), password: t("password"), submit: t("login_btn"),
          remember: t("remember_me"), show: t("show_password"), hide: t("hide_password"),
          bad: t("login_bad_customer"), locked: t("login_locked", { min: LOGIN_LOCK_MINUTES }),
          setup_db: t("setup_db"), setup_db_conn: t("setup_db_conn"), setup_secret: t("setup_secret"), setup_admin: t("setup_admin")
        }} />
        <div className="auth-divider" />
        <p className="auth-sub">{t("no_login_yet")}</p>
        <Link className="btn soft auth-register" href="/register">{t("register_meter")}<Icon name="arrowRight" /></Link>
        <Link className="auth-staff" href="/login?staff=1">💡 {t("staff_login_link")}</Link>
      </main>
    </div>
  );
}
