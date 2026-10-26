"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, clientIp } from "@/lib/auth";
import { audit } from "@/lib/audit";

const back = (msg) => redirect(`/applications?${msg}`);

// Approving creates the customer and their portal login (register), or links the meter (add_meter), in one transaction.
export async function approveApplication(formData) {
  const user = await requireUser("admin");
  const id = Number(formData.get("id"));
  const sql = await db();
  let error = null;
  await sql.begin(async (tx) => {
    const [app] = await tx`SELECT * FROM applications WHERE id = ${id} AND status = 'pending' FOR UPDATE`;
    if (!app) { error = "app_gone"; return; }
    const [meter] = await tx`SELECT id, customer_id FROM meters WHERE id = ${app.meter_id} FOR UPDATE`;
    if (!meter || meter.customer_id) { error = "app_meter_taken"; return; }

    if (app.kind === "register") {
      const d = app.data;
      const [phoneTaken] = await tx`SELECT 1 FROM users WHERE phone = ${d.phone}`;
      if (phoneTaken) { error = "phone_taken"; return; }
      const [loginTaken] = await tx`SELECT 1 FROM users WHERE lower(login) = lower(${app.modem_serial})`;
      if (loginTaken) { error = "app_meter_taken"; return; }
      const [customer] = await tx`
        INSERT INTO customers (kind, name, phone, inn, pinfl, region, district, street, house, cadastr_number)
        VALUES (${d.kind}, ${d.name}, ${d.phone}, ${d.inn || null}, ${d.pinfl || null}, ${d.region || null}, ${d.district || null}, ${d.street || null}, ${d.house || null}, ${d.cadastr_number || null})
        RETURNING id`;
      await tx`UPDATE meters SET customer_id = ${customer.id}, updated_at = now() WHERE id = ${meter.id}`;
      await tx`
        INSERT INTO users (full_name, phone, login, password_hash, role, client_type, customer_id)
        VALUES (${d.name}, ${d.phone}, ${app.modem_serial}, ${d.password_hash}, 'client', ${d.kind}, ${customer.id})`;
      // The password hash now lives on the user; don't keep a second copy on the application.
      await tx`UPDATE applications SET customer_id = ${customer.id}, data = data - 'password_hash' WHERE id = ${id}`;
    } else {
      await tx`UPDATE meters SET customer_id = ${app.customer_id}, updated_at = now() WHERE id = ${meter.id}`;
    }
    await tx`UPDATE applications SET status = 'approved', reviewed_by = ${user.id}, reviewed_at = now() WHERE id = ${id}`;
  });
  if (error) back(`err=${error}`);
  await audit(user, "approve", "application", id, null, clientIp());
  back("msg=app_approved_msg");
}

export async function rejectApplication(formData) {
  const user = await requireUser("admin");
  const id = Number(formData.get("id"));
  const note = String(formData.get("note") || "").trim().slice(0, 300) || null;
  const sql = await db();
  const [app] = await sql`
    UPDATE applications SET status = 'rejected', note = ${note}, reviewed_by = ${user.id}, reviewed_at = now(),
           data = data - 'password_hash'
    WHERE id = ${id} AND status = 'pending' RETURNING id`;
  if (!app) back("err=app_gone");
  await audit(user, "reject", "application", id, { note }, clientIp());
  back("msg=app_rejected_msg");
}
