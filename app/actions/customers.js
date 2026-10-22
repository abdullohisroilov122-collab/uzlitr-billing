"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, normalizePhone } from "@/lib/db";
import { requireUser, clientIp, PASSWORD_RULE } from "@/lib/auth";
import { audit } from "@/lib/audit";

const text = (fd, k) => { const v = String(fd.get(k) ?? "").trim(); return v || null; };
const coord = (fd, k, limit) => {
  const v = String(fd.get(k) ?? "").trim().replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : NaN;
};

export async function saveCustomer(formData) {
  const user = await requireUser("operator");
  const id = Number(formData.get("id")) || null;
  const back = id ? `/customers/${id}` : "/customers/new";
  const data = {
    kind: formData.get("kind") === "legal" ? "legal" : "individual",
    name: text(formData, "name"),
    phone: text(formData, "phone") ? normalizePhone(formData.get("phone")) : null,
    inn: text(formData, "inn"),
    pinfl: text(formData, "pinfl"),
    account_number: text(formData, "account_number"),
    region: text(formData, "region"),
    district: text(formData, "district"),
    street: text(formData, "street"),
    house: text(formData, "house"),
    latitude: coord(formData, "latitude", 90),
    longitude: coord(formData, "longitude", 180),
    notes: text(formData, "notes")
  };
  if (!data.name) redirect(`${back}?err=required`);
  if (Number.isNaN(data.latitude) || Number.isNaN(data.longitude)) redirect(`${back}?err=bad_coords`);
  if (data.inn && !/^\d{9}$/.test(data.inn)) redirect(`${back}?err=bad_inn`);
  if (data.pinfl && !/^\d{14}$/.test(data.pinfl)) redirect(`${back}?err=bad_pinfl`);

  const sql = await db();
  if (data.account_number) {
    const [clash] = await sql`SELECT id FROM customers WHERE account_number = ${data.account_number} AND id IS DISTINCT FROM ${id}`;
    if (clash) redirect(`${back}?err=account_taken`);
  }
  let customerId = id;
  if (id) await sql`UPDATE customers SET ${sql(data)}, updated_at = now() WHERE id = ${id}`;
  else [{ id: customerId }] = await sql`INSERT INTO customers ${sql(data)} RETURNING id`;
  await audit(user, id ? "update" : "create", "customer", customerId, { name: data.name, account_number: data.account_number }, clientIp());
  revalidatePath("/customers");
  redirect(`/customers/${customerId}?msg=saved`);
}

export async function deleteCustomer(formData) {
  const user = await requireUser("admin");
  const id = Number(formData.get("id"));
  const sql = await db();
  const [c] = await sql`DELETE FROM customers WHERE id = ${id} RETURNING name`;
  if (c) await audit(user, "delete", "customer", id, { name: c.name }, clientIp());
  redirect("/customers?msg=saved");
}

export async function linkMeter(formData) {
  const user = await requireUser("operator");
  const customerId = Number(formData.get("customer_id"));
  const meterId = Number(formData.get("meter_id"));
  if (!meterId) redirect(`/customers/${customerId}?err=required`);
  const sql = await db();
  await sql`UPDATE meters SET customer_id = ${customerId}, updated_at = now() WHERE id = ${meterId}`;
  await audit(user, "update", "meter", meterId, { customer_id: customerId }, clientIp());
  redirect(`/customers/${customerId}?msg=saved`);
}

export async function unlinkMeter(formData) {
  const user = await requireUser("operator");
  const customerId = Number(formData.get("customer_id"));
  const meterId = Number(formData.get("meter_id"));
  const sql = await db();
  await sql`UPDATE meters SET customer_id = NULL, updated_at = now() WHERE id = ${meterId} AND customer_id = ${customerId}`;
  await audit(user, "update", "meter", meterId, { customer_id: null }, clientIp());
  redirect(`/customers/${customerId}?msg=saved`);
}

// Creates or updates the customer's portal login (a user with role "client").
export async function savePortalAccess(formData) {
  const user = await requireUser("operator");
  const customerId = Number(formData.get("customer_id"));
  const back = `/customers/${customerId}`;
  const phone = normalizePhone(formData.get("login_phone"));
  const password = String(formData.get("password") || "");
  const active = formData.get("is_active") === "on";
  const sql = await db();
  const [customer] = await sql`SELECT name, kind FROM customers WHERE id = ${customerId}`;
  if (!customer || !phone) redirect(`${back}?err=required`);
  const [existing] = await sql`SELECT id FROM users WHERE customer_id = ${customerId} AND role = 'client'`;
  if (!existing && !password) redirect(`${back}?err=required`);
  if (password && !PASSWORD_RULE.test(password)) redirect(`${back}?err=password_rule`);
  const [clash] = await sql`SELECT id FROM users WHERE phone = ${phone} AND id IS DISTINCT FROM ${existing?.id ?? null}`;
  if (clash) redirect(`${back}?err=phone_taken`);

  const data = {
    full_name: customer.name, phone, role: "client", customer_id: customerId, is_active: active,
    client_type: customer.kind === "legal" ? "legal" : "individual",
    ...(password && { password_hash: await bcrypt.hash(password, 12) })
  };
  if (existing) await sql`UPDATE users SET ${sql(data)} WHERE id = ${existing.id}`;
  else await sql`INSERT INTO users ${sql(data)}`;
  await audit(user, existing ? "update" : "create", "portal_access", customerId, { phone, active, password_changed: !!password }, clientIp());
  redirect(`${back}?msg=saved`);
}
