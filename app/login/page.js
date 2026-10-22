import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { LOGIN_LOCK_MINUTES } from "@/lib/ratelimit";
import LangSwitch from "@/components/LangSwitch";
import LoginForm from "./LoginForm";
import LampScene from "./LampScene";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await currentUser().catch(() => null);
  if (user) redirect(user.role === "client" ? "/portal" : "/");
  const t = getT();
  return (
    <div className="lamp-root">
      <div className="lamp-lang"><LangSwitch /></div>
      <LampScene labels={{ hint: t("lamp_hint"), on: t("lamp_on"), off: t("lamp_off"), soundOn: t("sound_on"), soundOff: t("sound_off") }}>
        <div className="login">
          <div className="logo"><img src="/brand/uzlitrpro-logo.png" alt="UZLITRPRO" width="220" height="101" /></div>
          <p>{t("login_sub")}</p>
          <LoginForm labels={{
            phone: t("phone"), password: t("password"), submit: t("login_btn"),
            bad: t("login_bad"), locked: t("login_locked", { min: LOGIN_LOCK_MINUTES }),
            setup_db: t("setup_db"), setup_db_conn: t("setup_db_conn"), setup_secret: t("setup_secret"), setup_admin: t("setup_admin")
          }} />
        </div>
      </LampScene>
    </div>
  );
}
