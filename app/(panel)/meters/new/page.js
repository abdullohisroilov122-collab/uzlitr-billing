import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import MeterForm from "@/components/MeterForm";
import Flash from "@/components/Flash";

export default async function NewMeterPage({ searchParams }) {
  await requireUser();
  const t = getT();
  const sql = await db();
  const [models, customers] = await Promise.all([
    sql`SELECT id, name FROM models ORDER BY name`,
    sql`SELECT id, name, account_number FROM customers ORDER BY name LIMIT 2000`
  ]);
  return (
    <>
      <div className="head"><div>
        <div className="crumbs"><Link href="/meters">{t("meters_title")}</Link>›<span>{t("new_meter")}</span></div>
        <h1>{t("new_meter")}</h1></div></div>
      <Flash searchParams={searchParams} />
      <MeterForm models={models} customers={customers} meter={{ customer_id: Number(searchParams.customer) || null }} />
    </>
  );
}
