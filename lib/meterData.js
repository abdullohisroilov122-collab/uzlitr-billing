import { db } from "./db";
import { STATUS_SQL } from "./meters";

// One meter with its model and status, plus its customer (or null).
export async function loadMeter(id, { customerId } = {}) {
  const sql = await db();
  const [meter] = await sql`
    SELECT m.*, md.name AS model, md.ping_hours, ${sql.unsafe(STATUS_SQL)} AS status
    FROM meters m LEFT JOIN models md ON md.id = m.model_id
    WHERE m.id = ${id || 0} ${customerId ? sql`AND m.customer_id = ${customerId}` : sql``}`;
  if (!meter) return {};
  const [customer] = meter.customer_id ? await sql`SELECT * FROM customers WHERE id = ${meter.customer_id}` : [];
  return { meter, customer: customer || null };
}
