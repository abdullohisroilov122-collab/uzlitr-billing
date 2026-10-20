"use server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, normalizePhone } from "@/lib/db";
import { signSession, SESSION_COOKIE, SESSION_HOURS } from "@/lib/session";
import { loginLocked } from "@/lib/ratelimit";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/auth";
import { LANG_COOKIE, LANGS } from "@/lib/i18n";

// A real hash to compare against when the phone is unknown, so timing doesn't reveal which phones exist.
const DUMMY_HASH = "$2a$12$XnCeMTi7bYG./DNPEi3tYujgkXLhwbmIRR8MDGUfXgTYHxmpaP5S2";

// Names the missing setup step instead of failing with a generic server error.
async function setupProblem() {
  if (!process.env.DATABASE_URL) return "setup_db";
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

export async function login(_prev, formData) {
  const problem = await setupProblem();
  if (problem) return { error: problem };
  const phone = normalizePhone(formData.get("phone"));
  const password = String(formData.get("password") || "");
  const ip = clientIp();
  const sql = await db();

  if (!phone || (await loginLocked(phone))) return { error: "locked" };
  const [user] = await sql`SELECT id, password_hash, is_active FROM users WHERE phone = ${phone}`;
  const ok = await bcrypt.compare(password, user?.password_hash || DUMMY_HASH);
  await sql`INSERT INTO login_attempts (phone, ip, success) VALUES (${phone}, ${ip}, ${ok && !!user?.is_active})`;
  if (!ok || !user || !user.is_active) return { error: (await loginLocked(phone)) ? "locked" : "bad" };

  await sql`UPDATE users SET last_login_at = now() WHERE id = ${user.id}`;
  await audit(user, "login", "user", user.id, null, ip);
  cookies().set(SESSION_COOKIE, await signSession(user.id), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_HOURS * 3600
  });
  redirect("/");
}

export async function logout() {
  cookies().delete(SESSION_COOKIE);
  redirect("/login");
}

export async function setLanguage(formData) {
  const lang = String(formData.get("lang"));
  if (LANGS.some((l) => l.code === lang)) {
    cookies().set(LANG_COOKIE, lang, { path: "/", maxAge: 365 * 864e2, sameSite: "lax" });
  }
}
