import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { SESSION_COOKIE, readSession } from "./session";

export const ROLES = ["superadmin", "admin", "operator"];
export const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const RANK = { client: 0, operator: 1, admin: 2, superadmin: 3 };

export async function currentUser() {
  const session = await readSession(cookies().get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const sql = await db();
  const [user] = await sql`
    SELECT id, full_name, phone, role, client_type, pinfl, is_active, customer_id
    FROM users WHERE id = ${session.userId}`;
  return user && user.is_active ? user : null;
}

// Use at the top of every page and server action. Redirects to /login or throws on missing rights.
export async function requireUser(minRole = "operator") {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (RANK[user.role] < RANK[minRole]) {
    if (user.role === "client") redirect("/portal");
    throw new Error("Forbidden");
  }
  return user;
}

// Customer portal pages: only accounts linked to a customer.
export async function requireClient() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "client") redirect("/");
  if (!user.customer_id) throw new Error("This account is not linked to a customer");
  return user;
}

export function isStaff(user) {
  return RANK[user?.role] >= RANK.operator;
}

export function hasRole(user, minRole) {
  return RANK[user?.role] >= RANK[minRole];
}

export function clientIp() {
  const h = headers();
  return (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || null;
}
