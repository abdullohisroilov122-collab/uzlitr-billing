import Link from "next/link";
import { getT } from "@/lib/i18n";
import { logout } from "@/app/actions/auth";
import Icon from "./Icon";

export default function UserMenu({ user, settingsHref }) {
  const t = getT();
  return (
    <details className="menu">
      <summary className="userchip">
        <span className="avatar" aria-hidden="true">{user.full_name.slice(0, 1).toUpperCase()}</span>
        <div><b>{user.full_name}</b><small>{t(`role_${user.role}`)}</small></div>
        <span className="muted" style={{ display: "inline-flex" }}><Icon name="chevronDown" size={16} /></span>
      </summary>
      <div className="menu-pop" style={{ width: 240 }}>
        <div className="menu-head"><b>{user.full_name}</b><small className="mono">{user.phone}</small></div>
        <Link href={settingsHref}><Icon name="gear" />{t("nav_settings")}</Link>
        <form action={logout}><button type="submit" style={{ color: "var(--bad)" }}><Icon name="out" />{t("logout")}</button></form>
      </div>
    </details>
  );
}
