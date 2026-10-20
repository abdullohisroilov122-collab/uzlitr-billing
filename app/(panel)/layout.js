import { requireUser, hasRole } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { iconSvg } from "@/components/Icon";
import Icon from "@/components/Icon";
import { NavLinks } from "@/components/client";
import LangSwitch from "@/components/LangSwitch";
import { logout } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/", key: "nav_dashboard", icon: "home", role: "operator" },
  { href: "/meters", key: "nav_meters", icon: "drop", role: "operator" },
  { href: "/users", key: "nav_users", icon: "users", role: "admin" },
  { href: "/tokens", key: "nav_tokens", icon: "key", role: "admin" },
  { href: "/models", key: "nav_models", icon: "chip", role: "operator" },
  { href: "/audit", key: "nav_audit", icon: "log", role: "admin" },
  { href: "/security", key: "nav_security", icon: "shield", role: "admin" },
  { href: "/settings", key: "nav_settings", icon: "gear", role: "operator" }
];

export default async function PanelLayout({ children }) {
  const user = await requireUser();
  const t = getT();
  const items = NAV.filter((n) => hasRole(user, n.role)).map((n) => ({ href: n.href, label: t(n.key), icon: iconSvg(n.icon) }));
  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <div className="brand-mark"><Icon name="drop" size={18} /></div>
          <div><b>UZLITR</b><small>{t("appTagline")}</small></div>
        </div>
        <nav className="nav"><NavLinks items={items} /></nav>
        <div className="side-foot">© {new Date().getFullYear()} UZLITR<br />v0.1</div>
      </aside>
      <div className="main">
        <header className="top">
          <LangSwitch />
          <div className="top-right">
            <div className="who"><b>{user.full_name}</b><small>{t(`role_${user.role}`)}</small></div>
            <div className="avatar" aria-hidden="true">{user.full_name.slice(0, 1).toUpperCase()}</div>
            <form action={logout}><button className="btn sm" type="submit" title={t("logout")} aria-label={t("logout")}><Icon name="out" /></button></form>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
