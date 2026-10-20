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
  const models = await sql`SELECT id, name FROM models ORDER BY name`;
  return (
    <>
      <div className="head"><div><h1>{t("new_meter")}</h1></div><Link className="btn" href="/meters">{t("back")}</Link></div>
      <Flash searchParams={searchParams} />
      <MeterForm models={models} />
    </>
  );
}
