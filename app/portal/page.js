import Link from "next/link";
import { db } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { loadMeter } from "@/lib/meterData";
import { periodFrom } from "@/lib/usage";
import Icon from "@/components/Icon";
import { MeterDashboard, addressLines } from "@/components/dash";

export default async function PortalHome({ searchParams }) {
  const user = await requireClient();
  const t = getT();
  const sql = await db();
  const [customer] = await sql`SELECT * FROM customers WHERE id = ${user.customer_id}`;
  const meters = await sql`SELECT id, meter_serial, modem_serial FROM meters WHERE customer_id = ${user.customer_id} ORDER BY id`;
  // An id that isn't one of this customer's meters falls back to their first meter.
  const selectedId = meters.some((m) => m.id === Number(searchParams.meter)) ? Number(searchParams.meter) : meters[0]?.id;
  const { meter } = selectedId ? await loadMeter(selectedId, { customerId: user.customer_id }) : {};
  const period = periodFrom(searchParams.period);
  const lines = addressLines(customer);

  return (
    <>
      <section className="welcome">
        <div className="badge"><Icon name={customer.kind === "legal" ? "building" : "user"} /></div>
        <div style={{ minWidth: 0 }}>
          <h1>{customer.name}</h1>
          {lines.length > 0 && <div className="addr"><Icon name="pin" />{lines.join(", ")}</div>}
          {customer.account_number && <span className="pill">{t("account_number")}: <b className="mono">{customer.account_number}</b></span>}
        </div>
        <div className="tip"><Icon name="leaf" />{t("water_tip")}</div>
      </section>

      {meters.length > 1 && (
        <nav className="tabs" aria-label={t("nav_meters")}>
          {meters.map((m) => (
            <Link key={m.id} href={`/portal?meter=${m.id}`} aria-current={m.id === meter?.id ? "page" : undefined} className="mono">
              {m.meter_serial || m.modem_serial}
            </Link>
          ))}
        </nav>
      )}

      {meter ? (
        <MeterDashboard meter={meter} customer={customer} period={period}
          readingsHref={`/portal/readings?meter=${meter.id}`} periodHref={(p) => `/portal?meter=${meter.id}&period=${p}`} />
      ) : (
        <div className="card"><div className="empty"><b>{t("no_meters_yet")}</b><span>{t("no_meters_yet_d")}</span></div></div>
      )}
    </>
  );
}
