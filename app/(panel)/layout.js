import { requireUser, hasRole } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { getAlerts } from "@/lib/alerts";
import { iconSvg } from "@/components/Icon";
import { NavLinks } from "@/components/client";
import LangSwitch from "@/components/LangSwitch";
import Bell from "@/components/Bell";
import SoundToggle from "@/components/SoundToggle";
import UserMenu from "@/components/UserMenu";

export const dynamic = "force-dynamic";

const NAV = [
  { group: "nav_group_main", items: [
    { href: "/", key: "nav_dashboard", icon: "home", role: "operator" },
    { href: "/meters", key: "nav_meters", icon: "drop", role: "operator" },
    { href: "/customers", key: "nav_customers", icon: "building", role: "operator" }
  ] },
  { group: "nav_group_manage", items: [
    { href: "/models", key: "nav_models", icon: "chip", role: "operator" },
    { href: "/users", key: "nav_users", icon: "users", role: "admin" },
    { href: "/tokens", key: "nav_tokens", icon: "key", role: "admin" }
  ] },
  { group: "nav_group_system", items: [
    { href: "/audit", key: "nav_audit", icon: "log", role: "admin" },
    { href: "/security", key: "nav_security", icon: "shield", role: "admin" },
    { href: "/settings", key: "nav_settings", icon: "gear", role: "operator" }
  ] }
];

export default async function PanelLayout({ children }) {
  const user = await requireUser();
  const t = getT();
  const alerts = await getAlerts({ includeForwarding: hasRole(user, "admin") }).catch(() => []);
  const groups = NAV.map((g) => ({
    label: t(g.group),
    items: g.items.filter((n) => hasRole(user, n.role)).map((n) => ({ href: n.href, label: t(n.key), icon: iconSvg(n.icon) }))
  })).filter((g) => g.items.length);

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <img src="/brand/uzlitrpro-logo.png" alt="UZLITRPRO" width="180" height="83" />
        </div>
        <nav className="nav">
          {groups.map((g) => (
            <div key={g.label} style={{ display: "contents" }}>
              <div className="nav-label">{g.label}</div>
              <NavLinks items={g.items} />
            </div>
          ))}
        </nav>
        <div className="side-foot">© {new Date().getFullYear()} UZLITRPRO · v0.2</div>
      </aside>
      <div className="main">
        <header className="top">
          <LangSwitch />
          <div className="top-right">
            <SoundToggle labels={{ on: t("sound_on"), off: t("sound_off") }} />
            <Bell alerts={alerts} hrefFor={(a) => (a.meterId ? `/meters/${a.meterId}` : a.type === "forward" ? "/" : null)} />
            <UserMenu user={user} settingsHref="/settings" />
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
