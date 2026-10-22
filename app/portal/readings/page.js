import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { loadMeter } from "@/lib/meterData";
import ReadingsView from "@/components/ReadingsView";

export default async function PortalReadings({ searchParams }) {
  const user = await requireClient();
  const sql = await db();
  const [first] = await sql`SELECT id FROM meters WHERE customer_id = ${user.customer_id} ORDER BY id LIMIT 1`;
  const { meter } = await loadMeter(Number(searchParams.meter) || first?.id, { customerId: user.customer_id });
  if (!meter) redirect("/portal");
  return (
    <ReadingsView meter={meter} searchParams={searchParams} backHref={`/portal?meter=${meter.id}`}
      basePath={`/portal/readings`} extraParams={{ meter: meter.id }} showForward={false} />
  );
}
