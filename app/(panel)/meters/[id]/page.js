import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { loadMeter } from "@/lib/meterData";
import { periodFrom } from "@/lib/usage";
import Icon from "@/components/Icon";
import Status from "@/components/Status";
import Flash from "@/components/Flash";
import { MeterDashboard } from "@/components/dash";
import VodokanalCard from "@/components/VodokanalCard";

export default async function MeterPage({ params, searchParams }) {
  await requireUser();
  const t = getT();
  const { meter, customer } = await loadMeter(Number(params.id));
  if (!meter) notFound();
  const period = periodFrom(searchParams.period);
  return (
    <>
      <div className="head">
        <div>
          <div className="crumbs"><Link href="/meters">{t("meters_title")}</Link>›<span className="mono">{meter.meter_serial || meter.modem_serial}</span></div>
          <h1><span className="mono">{meter.meter_serial || meter.modem_serial}</span><Status value={meter.status} /></h1>
          <p>{customer ? <Link className="link" href={`/customers/${customer.id}`}>{customer.name}</Link> : t("not_linked")}{meter.model ? ` · ${meter.model}` : ""}</p>
        </div>
        <div className="actions">
          <Link className="btn" href={`/meters/${meter.id}/readings`}><Icon name="history" />{t("readings_history")}</Link>
          <Link className="btn primary" href={`/meters/${meter.id}/edit`}><Icon name="edit" />{t("edit")}</Link>
        </div>
      </div>
      <Flash searchParams={searchParams} />
      <MeterDashboard meter={meter} customer={customer} period={period}
        readingsHref={`/meters/${meter.id}/readings`} periodHref={(p) => `/meters/${meter.id}?period=${p}`} />
      <VodokanalCard meter={meter} customer={customer} />
    </>
  );
}
