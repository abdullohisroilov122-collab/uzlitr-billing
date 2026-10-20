"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db, normalizePhone } from "@/lib/db";
import { requireUser, hasRole, clientIp, ROLES, PASSWORD_RULE } from "@/lib/auth";
import { audit } from "@/lib/audit";


export async function saveUser(formData) {
  const me = await requireUser("admin");
  const id = Number(formData.get("id")) || null;
  const back = `/users?edit=${id || "new"}`;
  const role = ROLES.includes(formData.get("role")) ? formData.get("role") : "operator";
  // Only a SuperAdmin may grant or edit admin-level accounts.
  if (role !== "operator" && !hasRole(me, "superadmin")) redirect(`${back}&err=forbidden`);
  const data = {
    full_name: String(formData.get("full_name") || "").trim(),
    phone: normalizePhone(formData.get("phone")),
    role,
    client_type: formData.get("client_type") === "legal" ? "legal" : "individual",
    pinfl: String(formData.get("pinfl") || "").trim() || null,
    is_active: formData.get("is_active") === "on"
  };
  const password = String(formData.get("password") || "");
  if (!data.full_name || !data.phone || (!id && !password)) redirect(`${back}&err=required`);
  if (password && !PASSWORD_RULE.test(password)) redirect(`${back}&err=password_rule`);
  if (id === me.id && !data.is_active) redirect(`${back}&err=cant_self`);

  const sql = await db();
  if (id) {
    const [target] = await sql`SELECT role FROM users WHERE id = ${id}`;
    if (!target) redirect("/users");
    if (target.role !== "operator" && !hasRole(me, "superadmin")) redirect(`${back}&err=forbidden`);
  }
  const [clash] = await sql`SELECT id FROM users WHERE phone = ${data.phone} AND id IS DISTINCT FROM ${id}`;
  if (clash) redirect(`${back}&err=phone_taken`);
  if (password) data.password_hash = await bcrypt.hash(password, 12);

  let userId = id;
  if (id) await sql`UPDATE users SET ${sql(data)} WHERE id = ${id}`;
  else [{ id: userId }] = await sql`INSERT INTO users ${sql(data)} RETURNING id`;
  await audit(me, id ? "update" : "create", "user", userId, { phone: data.phone, role: data.role, password_changed: !!password }, clientIp());
  redirect("/users?msg=saved");
}

export async function deleteUser(formData) {
  const me = await requireUser("admin");
  const id = Number(formData.get("id"));
  if (id === me.id) redirect("/users?err=cant_self");
  const sql = await db();
  const [target] = await sql`SELECT role, phone FROM users WHERE id = ${id}`;
  if (!target) redirect("/users");
  if (target.role !== "operator" && !hasRole(me, "superadmin")) redirect("/users?err=forbidden");
  await sql`DELETE FROM users WHERE id = ${id}`;
  await audit(me, "delete", "user", id, { phone: target.phone }, clientIp());
  redirect("/users?msg=saved");
}
