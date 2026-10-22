import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, hasRole } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { loadMeter } from "@/lib/meterData";
import Flash from "@/components/Flash";
import MeterForm from "@/components/MeterForm";
import { ConfirmSubmit } from "@/components/client";
import { deleteMeter } from "@/app/actions/meters";

export default async function EditMeterPage({ params, searchParams }) {
  const user = await requireUser();
  const t = getT();
  const { meter } = await loadMeter(Number(params.id));
  if (!meter) notFound();
  const sql = await db();
  const [models, customers] = await Promise.all([
    sql`SELECT id, name FROM models ORDER BY name`,
    sql`SELECT id, name, account_number FROM customers ORDER BY name LIMIT 2000`
  ]);
  const serial = meter.meter_serial || meter.modem_serial;
  return (
    <>
      <div className="head"><div>
        <div className="crumbs"><Link href="/meters">{t("meters_title")}</Link>›<Link className="mono" href={`/meters/${meter.id}`}>{serial}</Link>›<span>{t("edit")}</span></div>
        <h1>{t("edit_meter")}</h1></div></div>
      <Flash searchParams={searchParams} />
      <MeterForm meter={meter} models={models} customers={customers} />
      {hasRole(user, "admin") && (
        <form action={deleteMeter} className="actions">
          <input type="hidden" name="id" value={meter.id} />
          <ConfirmSubmit label={t("delete")} question={t("confirm_delete_meter")} confirmLabel={t("yes_delete")} cancelLabel={t("cancel")} />
        </form>
      )}
    </>
  );
}
