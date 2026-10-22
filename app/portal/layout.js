import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { getAlerts } from "@/lib/alerts";
import LangSwitch from "@/components/LangSwitch";
import Bell from "@/components/Bell";
import UserMenu from "@/components/UserMenu";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }) {
  const user = await requireClient();
  const t = getT();
  const alerts = await getAlerts({ customerId: user.customer_id }).catch(() => []);
  return (
    <>
      <header className="portal-top">
        <div className="inner">
          <Link href="/portal" className="logo"><img src="/brand/uzlitrpro-logo.png" alt="UZLITRPRO" width="113" height="52" /></Link>
          <span className="slogan">{t("slogan")}</span>
          <div className="top-right" style={{ marginLeft: "auto" }}>
            <LangSwitch align="right" />
            <Bell alerts={alerts} hrefFor={(a) => (a.meterId ? `/portal?meter=${a.meterId}` : null)} />
            <UserMenu user={user} settingsHref="/portal/settings" />
          </div>
        </div>
      </header>
      <main className="portal-main">{children}</main>
    </>
  );
}
