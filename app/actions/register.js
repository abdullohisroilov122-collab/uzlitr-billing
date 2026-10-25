"use server";
import bcrypt from "bcryptjs";
import { db, normalizePhone } from "@/lib/db";
import { clientIp, requireClient, PASSWORD_RULE } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { audit } from "@/lib/audit";
import { sendTelegram } from "@/lib/telegram";

const MODEM_RE = /^[A-Za-z0-9-]{4,32}$/;
const clean = (v, max = 120) => String(v ?? "").trim().slice(0, max);

// Says only whether this modem can be registered, never who owns it, so it can't be used to look people up.
async function modemStatus(sql, modem) {
  const [meter] = await sql`
    SELECT m.id, m.modem_serial, m.customer_id,
           EXISTS (SELECT 1 FROM users u WHERE u.customer_id = m.customer_id AND u.role = 'client') AS has_portal
    FROM meters m WHERE lower(m.modem_serial) = lower(${modem})`;
  if (!meter) return { status: "not_found" };
  const [pending] = await sql`SELECT 1 FROM applications WHERE meter_id = ${meter.id} AND status = 'pending'`;
  if (pending) return { status: "pending" };
  if (meter.has_portal || meter.customer_id) return { status: "taken", meter };
  return { status: "ok", meter };
}

async function limited(prefix) {
  const r = await rateLimit(`${prefix}:${clientIp() || "unknown"}`, 20, 600);
  return !r.allowed;
}

export async function checkModem(modemInput) {
  const modem = clean(modemInput, 32);
  if (!MODEM_RE.test(modem)) return { status: "invalid" };
  if (await limited("reg-check")) return { status: "rate" };
  const sql = await db();
  const r = await modemStatus(sql, modem);
  return { status: r.status, modem: r.meter?.modem_serial };
}

// Step-by-step registration form → a pending application that an admin approves.
export async function submitRegistration(input) {
  if (await limited("reg-submit")) return { error: "rate" };
  const modem = clean(input.modem, 32);
  const kind = input.kind === "legal" ? "legal" : "individual";
  const data = {
    kind,
    name: clean(input.name),
    phone: normalizePhone(input.phone),
    inn: kind === "legal" ? clean(input.inn, 9) : null,
    pinfl: kind === "individual" ? clean(input.pinfl, 14) || null : null,
    region: clean(input.region), district: clean(input.district), street: clean(input.street), house: clean(input.house, 20)
  };
  const password = String(input.password || "");
  if (!MODEM_RE.test(modem) || !data.name || data.phone.length < 12 || !data.region || !data.street) return { error: "required" };
  if (kind === "legal" && !/^\d{9}$/.test(data.inn || "")) return { error: "bad_inn" };
  if (data.pinfl && !/^\d{14}$/.test(data.pinfl)) return { error: "bad_pinfl" };
  if (!PASSWORD_RULE.test(password)) return { error: "password_rule" };
  if (password !== String(input.password2 || "")) return { error: "password_mismatch" };

  const sql = await db();
  const r = await modemStatus(sql, modem);
  if (r.status !== "ok") return { error: `modem_${r.status}` };
  const [phoneTaken] = await sql`SELECT 1 FROM users WHERE phone = ${data.phone}`;
  if (phoneTaken) return { error: "phone_taken" };

  data.password_hash = await bcrypt.hash(password, 12);
  const [app] = await sql`
    INSERT INTO applications (kind, modem_serial, meter_id, data, ip)
    VALUES ('register', ${r.meter.modem_serial}, ${r.meter.id}, ${sql.json(data)}, ${clientIp()}) RETURNING id`;
  await audit(null, "create", "application", app.id, { kind: "register", modem: r.meter.modem_serial }, clientIp());
  await sendTelegram(`📝 UZLITR: yangi ro'yxatdan o'tish arizasi #${app.id}\n${data.name} · modem ${r.meter.modem_serial}`).catch(() => {});
  return { ok: true, login: r.meter.modem_serial };
}

// From the customer portal: ask to link another meter to this account.
export async function submitAddMeter(modemInput) {
  const user = await requireClient();
  if (await limited("add-meter")) return { error: "rate" };
  const modem = clean(modemInput, 32);
  if (!MODEM_RE.test(modem)) return { error: "modem_invalid" };
  const sql = await db();
  const r = await modemStatus(sql, modem);
  if (r.status !== "ok") return { error: `modem_${r.status}` };
  const [app] = await sql`
    INSERT INTO applications (kind, modem_serial, meter_id, customer_id, ip)
    VALUES ('add_meter', ${r.meter.modem_serial}, ${r.meter.id}, ${user.customer_id}, ${clientIp()}) RETURNING id`;
  await audit(user, "create", "application", app.id, { kind: "add_meter", modem: r.meter.modem_serial }, clientIp());
  await sendTelegram(`📝 UZLITR: yangi hisoblagich qo'shish arizasi #${app.id} · modem ${r.meter.modem_serial}`).catch(() => {});
  return { ok: true };
}
