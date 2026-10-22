"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, clientIp } from "@/lib/auth";
import { audit } from "@/lib/audit";

const text = (fd, k) => { const v = String(fd.get(k) ?? "").trim(); return v || null; };

export async function saveMeter(formData) {
  const user = await requireUser("operator");
  const id = Number(formData.get("id")) || null;
  const data = {
    meter_serial: text(formData, "meter_serial"),
    modem_serial: text(formData, "modem_serial"),
    model_id: Number(formData.get("model_id")) || null,
    customer_id: Number(formData.get("customer_id")) || null,
    installed_at: /^\d{4}-\d{2}-\d{2}$/.test(formData.get("installed_at") || "") ? formData.get("installed_at") : null,
    notes: text(formData, "notes")
  };
  const back = id ? `/meters/${id}/edit` : "/meters/new";
  if (!data.modem_serial) redirect(`${back}?err=required`);

  const sql = await db();
  const [clash] = await sql`
    SELECT id FROM meters
    WHERE (modem_serial = ${data.modem_serial} OR (${data.meter_serial}::text IS NOT NULL AND meter_serial = ${data.meter_serial}))
      AND id IS DISTINCT FROM ${id}`;
  if (clash) redirect(`${back}?err=serial_taken`);

  let meterId = id;
  if (id) {
    await sql`UPDATE meters SET ${sql(data)}, updated_at = now() WHERE id = ${id}`;
  } else {
    [{ id: meterId }] = await sql`INSERT INTO meters ${sql(data)} RETURNING id`;
  }
  await audit(user, id ? "update" : "create", "meter", meterId, { modem_serial: data.modem_serial, meter_serial: data.meter_serial, customer_id: data.customer_id }, clientIp());
  revalidatePath("/meters");
  redirect(`/meters/${meterId}?msg=saved`);
}

export async function deleteMeter(formData) {
  const user = await requireUser("admin");
  const id = Number(formData.get("id"));
  const sql = await db();
  const [m] = await sql`DELETE FROM meters WHERE id = ${id} RETURNING modem_serial`;
  if (m) await audit(user, "delete", "meter", id, { modem_serial: m.modem_serial }, clientIp());
  redirect("/meters?msg=saved");
}
