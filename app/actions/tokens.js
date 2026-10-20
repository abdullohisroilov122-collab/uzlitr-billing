"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, clientIp } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { newToken, USER_SCOPES } from "@/lib/tokens";

// Returns the plain token once so the page can show it; only the hash is stored.
export async function createToken(_prev, formData) {
  const user = await requireUser("admin");
  const kind = formData.get("kind") === "meter" ? "meter" : "user";
  const sql = await db();
  let meterId = null, name = String(formData.get("name") || "").trim();
  let scopes = [];
  if (kind === "meter") {
    meterId = Number(formData.get("meter_id")) || null;
    const [meter] = meterId ? await sql`SELECT modem_serial FROM meters WHERE id = ${meterId}` : [];
    if (!meter) return { error: "required" };
    name = name || meter.modem_serial;
    scopes = ["ingest"];
  } else {
    scopes = USER_SCOPES.filter((s) => formData.get(`scope_${s}`) === "on");
    if (!name || !scopes.length) return { error: "required" };
  }
  const token = newToken(kind);
  const [row] = await sql`
    INSERT INTO tokens (kind, name, token_prefix, token_hash, scopes, meter_id, created_by)
    VALUES (${kind}, ${name}, ${token.prefix}, ${token.hash}, ${scopes}, ${meterId}, ${user.id}) RETURNING id`;
  await audit(user, "create", "token", row.id, { kind, name, scopes }, clientIp());
  revalidatePath("/tokens");
  return { token: token.plain };
}

export async function revokeToken(formData) {
  const user = await requireUser("admin");
  const id = Number(formData.get("id"));
  const sql = await db();
  const [row] = await sql`UPDATE tokens SET is_active = false WHERE id = ${id} RETURNING kind, name`;
  if (row) await audit(user, "revoke", "token", id, row, clientIp());
  revalidatePath("/tokens");
}
