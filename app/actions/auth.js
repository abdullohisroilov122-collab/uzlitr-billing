"use server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, normalizePhone, databaseUrl } from "@/lib/db";
import { signSession, SESSION_COOKIE, SESSION_HOURS, REMEMBER_DAYS, readSession } from "@/lib/session";
import { loginLocked } from "@/lib/ratelimit";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/auth";
import { LANG_COOKIE, LANGS } from "@/lib/i18n";

// A real hash to compare against when the phone is unknown, so timing doesn't reveal which phones exist.
const DUMMY_HASH = "$2a$12$XnCeMTi7bYG./DNPEi3tYujgkXLhwbmIRR8MDGUfXgTYHxmpaP5S2";

// Names the missing setup step instead of failing with a generic server error.
async function setupProblem() {
  if (!databaseUrl()) return "setup_db";
  if ((process.env.SESSION_SECRET || "").length < 32) return "setup_secret";
  try {
    const sql = await db();
    const [{ count }] = await sql`SELECT count(*)::int AS count FROM users`;
    if (count === 0) return "setup_admin";
  } catch (err) {
    console.error("Database connection failed", err);
    return "setup_db_conn";
  }
  return null;
}

// One /login page: the customer card takes a modem number or phone (staff may use it too); ?staff=1 is the lamp form for staff only.
export async function login(_prev, formData) {
  const problem = await setupProblem();
  if (problem) return { error: problem };
  const staffDoor = formData.get("door") === "staff";
  const identifier = String(formData.get("login") || formData.get("phone") || "").trim();
  const password = String(formData.get("password") || "");
  const remember = !staffDoor && formData.get("remember") === "on";
  const ip = clientIp();
  const sql = await db();
  const key = identifier.toLowerCase();

  if (!identifier || (await loginLocked(key))) return { error: "locked" };
  const phone = normalizePhone(identifier);
  const [user] = await sql`
    SELECT id, role, password_hash, is_active FROM users
    WHERE lower(login) = ${key} ${phone.length >= 12 ? sql`OR phone = ${phone}` : sql``}
    ORDER BY (lower(login) = ${key}) DESC NULLS LAST LIMIT 1`;
  const ok = await bcrypt.compare(password, user?.password_hash || DUMMY_HASH);
  const allowed = ok && !!user?.is_active && !(staffDoor && user.role === "client");
  await sql`INSERT INTO login_attempts (phone, ip, success) VALUES (${key}, ${ip}, ${allowed})`;
  if (ok && user?.is_active && staffDoor && user.role === "client") return { error: "staff_only" };
  if (!allowed) return { error: (await loginLocked(key)) ? "locked" : "bad" };

  await sql`UPDATE users SET last_login_at = now() WHERE id = ${user.id}`;
  await audit(user, "login", "user", user.id, { door: staffDoor ? "staff" : "customer", remember }, ip);
  const hours = remember ? REMEMBER_DAYS * 24 : SESSION_HOURS;
  cookies().set(SESSION_COOKIE, await signSession(user.id, hours), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/",
    ...(remember || staffDoor ? { maxAge: hours * 3600 } : {})
  });
  redirect(user.role === "client" ? "/portal" : "/");
}

export async function logout() {
  // Send people back to the door they came in by.
  const session = await readSession(cookies().get(SESSION_COOKIE)?.value);
  let to = "/login";
  if (session) {
    const sql = await db();
    const [u] = await sql`SELECT role FROM users WHERE id = ${session.userId}`;
    if (u && u.role !== "client") to = "/login?staff=1";
  }
  cookies().delete(SESSION_COOKIE);
  redirect(to);
}

export async function setLanguage(formData) {
  const lang = String(formData.get("lang"));
  if (LANGS.some((l) => l.code === lang)) {
    cookies().set(LANG_COOKIE, lang, { path: "/", maxAge: 365 * 864e2, sameSite: "lax" });
  }
}
