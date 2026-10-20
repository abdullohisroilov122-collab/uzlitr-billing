import { db } from "./db";

export async function audit(user, action, entity, entityId, details, ip) {
  const sql = await db();
  await sql`
    INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip)
    VALUES (${user?.id ?? null}, ${action}, ${entity}, ${entityId == null ? null : String(entityId)},
            ${details ? sql.json(details) : null}, ${ip ?? null})`;
}
