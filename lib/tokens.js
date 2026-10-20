import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";

export const USER_SCOPES = ["ingest", "read"];

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

// Returns the plain token once; only its hash is stored.
export function newToken(kind) {
  const plain = `${kind === "meter" ? "mtr" : "usr"}_${randomBytes(24).toString("base64url")}`;
  return { plain, prefix: plain.slice(0, 10), hash: hashToken(plain) };
}

export function bearer(request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : request.headers.get("x-api-key");
}

export async function findToken(plain) {
  if (!plain) return null;
  const sql = await db();
  const [token] = await sql`
    UPDATE tokens SET last_used_at = now()
    WHERE token_hash = ${hashToken(plain)} AND is_active
    RETURNING id, kind, name, scopes, meter_id`;
  return token || null;
}
