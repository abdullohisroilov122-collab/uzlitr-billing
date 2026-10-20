import { db } from "./db";

// Fixed-window counter in Postgres, so it holds across serverless instances.
export async function rateLimit(key, limit, windowSeconds) {
  const sql = await db();
  const [row] = await sql`
    INSERT INTO rate_limits (key, window_start, count) VALUES (${key}, now(), 1)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds})
                   THEN 1 ELSE rate_limits.count + 1 END,
      window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds})
                          THEN now() ELSE rate_limits.window_start END
    RETURNING count`;
  return { allowed: row.count <= limit, count: row.count, limit };
}

export const INGEST_PER_MINUTE = 120;
export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_LOCK_MINUTES = 15;

export async function loginLocked(phone) {
  const sql = await db();
  const [{ failures }] = await sql`
    SELECT count(*)::int AS failures FROM login_attempts
    WHERE phone = ${phone} AND NOT success
      AND created_at > now() - make_interval(mins => ${LOGIN_LOCK_MINUTES})
      AND created_at > coalesce((SELECT max(created_at) FROM login_attempts WHERE phone = ${phone} AND success), 'epoch')`;
  return failures >= LOGIN_MAX_FAILURES;
}
