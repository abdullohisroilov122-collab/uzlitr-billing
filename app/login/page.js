import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { LOGIN_LOCK_MINUTES } from "@/lib/ratelimit";
import LangSwitch from "@/components/LangSwitch";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentUser().catch(() => null)) redirect("/");
  const t = getT();
  return (
    <div className="login-wrap">
      <div className="login">
        <div style={{ display: "flex", justifyContent: "center" }}><img src="/logo.svg" alt="" width="44" height="44" /></div>
        <h1>UZLITR</h1>
        <p>{t("login_sub")}</p>
        <div style={{ display: "flex", justifyContent: "center" }}><LangSwitch /></div>
        <LoginForm labels={{
          phone: t("phone"), password: t("password"), submit: t("login_btn"),
          bad: t("login_bad"), locked: t("login_locked", { min: LOGIN_LOCK_MINUTES }),
          setup_db: t("setup_db"), setup_db_conn: t("setup_db_conn"), setup_secret: t("setup_secret"), setup_admin: t("setup_admin")
        }} />
      </div>
    </div>
  );
}
