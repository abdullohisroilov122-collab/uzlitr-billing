import postgres from "postgres";
import bcrypt from "bcryptjs";
import { SCHEMA_SQL } from "./schema";

let client;
let ready;

// Vercel's Neon integration names the variable after the chosen prefix, so accept the common names.
export function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.STORAGE_URL || "";
}

function connect() {
  if (!databaseUrl()) {
    throw new Error("DATABASE_URL is not set. Add a Postgres database in Vercel → Storage.");
  }
  // prepare:false keeps the client compatible with pooled (PgBouncer) connection strings.
  return postgres(databaseUrl(), { max: 5, prepare: false, idle_timeout: 20 });
}

// Returns the shared client after the schema exists and the first SuperAdmin is created.
export async function db() {
  if (!client) client = connect();
  if (!ready) {
    ready = setup(client).catch((err) => {
      ready = undefined;
      throw err;
    });
  }
  await ready;
  return client;
}

async function setup(sql) {
  await sql.unsafe(SCHEMA_SQL);
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM users`;
  if (count === 0 && process.env.ADMIN_PHONE && process.env.ADMIN_PASSWORD) {
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
    await sql`
      INSERT INTO users (full_name, phone, password_hash, role)
      VALUES ('SuperAdmin', ${normalizePhone(process.env.ADMIN_PHONE)}, ${hash}, 'superadmin')
      ON CONFLICT (phone) DO NOTHING`;
  }
}

export function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 9) return "+998" + digits;
  return digits ? "+" + digits : "";
}

export async function getSetting(key, fallback = null) {
  const sql = await db();
  const [row] = await sql`SELECT value FROM settings WHERE key = ${key}`;
  return row ? row.value : fallback;
}

export async function setSetting(key, value) {
  const sql = await db();
  await sql`
    INSERT INTO settings (key, value) VALUES (${key}, ${sql.json(value)})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
}
