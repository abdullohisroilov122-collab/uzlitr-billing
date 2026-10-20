"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, clientIp } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function saveModel(formData) {
  const user = await requireUser("admin");
  const id = Number(formData.get("id")) || null;
  const int = (k, d = null) => { const n = parseInt(formData.get(k), 10); return Number.isFinite(n) && n > 0 ? n : d; };
  const data = {
    name: String(formData.get("name") || "").trim(),
    manufacturer: String(formData.get("manufacturer") || "").trim() || null,
    description: String(formData.get("description") || "").trim() || null,
    diameter_mm: int("diameter_mm"),
    ping_hours: int("ping_hours", 24)
  };
  if (!data.name) redirect(`/models?edit=${id || "new"}&err=required`);
  const sql = await db();
  const [clash] = await sql`SELECT id FROM models WHERE name = ${data.name} AND id IS DISTINCT FROM ${id}`;
  if (clash) redirect(`/models?edit=${id || "new"}&err=serial_taken`);
  let modelId = id;
  if (id) await sql`UPDATE models SET ${sql(data)} WHERE id = ${id}`;
  else [{ id: modelId }] = await sql`INSERT INTO models ${sql(data)} RETURNING id`;
  await audit(user, id ? "update" : "create", "model", modelId, { name: data.name }, clientIp());
  redirect("/models?msg=saved");
}

export async function deleteModel(formData) {
  const user = await requireUser("admin");
  const id = Number(formData.get("id"));
  const sql = await db();
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM meters WHERE model_id = ${id}`;
  if (n) redirect("/models?err=model_in_use");
  const [m] = await sql`DELETE FROM models WHERE id = ${id} RETURNING name`;
  if (m) await audit(user, "delete", "model", id, { name: m.name }, clientIp());
  redirect("/models?msg=saved");
}
