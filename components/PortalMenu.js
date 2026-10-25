import Link from "next/link";
import { getT, getLang, LANGS } from "@/lib/i18n";
import { logout, setLanguage } from "@/app/actions/auth";
import Icon from "./Icon";
import SoundMenuItem from "./SoundMenuItem";

// The customer's avatar menu: profile, language, sound and sign out in one place.
export default function PortalMenu({ user }) {
  const t = getT(), lang = getLang();
  return (
    <details className="menu">
      <summary className="userchip portal-chip" aria-label={user.full_name}>
        <span className="avatar"><Icon name="user" size={18} /></span>
      </summary>
      <div className="menu-pop" style={{ width: 250 }}>
        <div className="menu-head"><b>{user.full_name}</b><small className="mono">{user.login || user.phone}</small></div>
        <Link href="/portal/profile"><Icon name="user" />{t("profile")}</Link>
        <div className="menu-label"><Icon name="globe" />{t("language")}</div>
        <form action={setLanguage}>
          {LANGS.map((l) => (
            <button key={l.code} type="submit" name="lang" value={l.code} className={l.code === lang ? "is-current" : undefined}>{l.label}</button>
          ))}
        </form>
        <div className="menu-sep" />
        <SoundMenuItem labels={{ on: t("sound_on"), off: t("sound_off") }} />
        <form action={logout}><button type="submit" style={{ color: "var(--bad)" }}><Icon name="out" />{t("logout")}</button></form>
      </div>
    </details>
  );
}
