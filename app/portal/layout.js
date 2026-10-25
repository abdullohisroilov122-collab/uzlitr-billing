import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { getAlerts } from "@/lib/alerts";
import Bell from "@/components/Bell";
import PortalMenu from "@/components/PortalMenu";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }) {
  const user = await requireClient();
  const alerts = await getAlerts({ customerId: user.customer_id }).catch(() => []);
  return (
    <>
      <header className="portal-top">
        <div className="inner">
          <Link href="/portal" className="logo"><img src="/brand/uzlitrpro-logo.png" alt="UZLITRPRO" width="113" height="52" /></Link>
          <div className="top-right" style={{ marginLeft: "auto" }}>
            <Bell alerts={alerts} hrefFor={(a) => (a.meterId ? `/portal?meter=${a.meterId}` : null)} />
            <PortalMenu user={user} />
          </div>
        </div>
      </header>
      <main className="portal-main">{children}</main>
    </>
  );
}
