import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { LOGIN_LOCK_MINUTES } from "@/lib/ratelimit";
import LangSwitch from "@/components/LangSwitch";
import Icon from "@/components/Icon";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

// Customer sign-in (SWEM-style): banner, then a card with login, password, remember me and self-registration.
export default async function LoginPage() {
  const user = await currentUser().catch(() => null);
  if (user) redirect(user.role === "client" ? "/portal" : "/");
  const t = getT();
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
      </main>
    </div>
  );
}
