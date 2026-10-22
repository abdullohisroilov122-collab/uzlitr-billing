import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { loadMeter } from "@/lib/meterData";
import ReadingsView from "@/components/ReadingsView";

export default async function MeterReadingsPage({ params, searchParams }) {
  await requireUser();
  const t = getT();
  const { meter } = await loadMeter(Number(params.id));
  if (!meter) notFound();
  const serial = meter.meter_serial || meter.modem_serial;
  return (
    <>
      <div className="crumbs"><Link href="/meters">{t("meters_title")}</Link>›<Link className="mono" href={`/meters/${meter.id}`}>{serial}</Link>›<span>{t("readings_history")}</span></div>
      <ReadingsView meter={meter} searchParams={searchParams} backHref={`/meters/${meter.id}`} basePath={`/meters/${meter.id}/readings`} showForward />
    </>
  );
}
