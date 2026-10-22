import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { LOGIN_LOCK_MINUTES } from "@/lib/ratelimit";
import LangSwitch from "@/components/LangSwitch";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await currentUser().catch(() => null);
  if (user) redirect(user.role === "client" ? "/portal" : "/");
  const t = getT();
  return (
    <div className="login-wrap">
      <div className="login">
        <div className="logo"><img src="/brand/uzlitrpro-logo.png" alt="UZLITRPRO" width="240" height="110" /></div>
        <p>{t("login_sub")}</p>
        <div style={{ display: "flex", justifyContent: "center" }}><LangSwitch align="center" /></div>
        <LoginForm labels={{
          phone: t("phone"), password: t("password"), submit: t("login_btn"),
          bad: t("login_bad"), locked: t("login_locked", { min: LOGIN_LOCK_MINUTES }),
          setup_db: t("setup_db"), setup_db_conn: t("setup_db_conn"), setup_secret: t("setup_secret"), setup_admin: t("setup_admin")
        }} />
      </div>
    </div>
  );
}
