// POST /api/ingest — modems or the manufacturer's platform send meter readings here.
// Auth: "Authorization: Bearer <token>" (or "X-API-Key: <token>").
// Body: one reading, an array of readings, or { "readings": [...] }. See README for the format.
import { NextResponse } from "next/server";
import { bearer, findToken } from "@/lib/tokens";
import { rateLimit, INGEST_PER_MINUTE } from "@/lib/ratelimit";
import { parseReading, storeReading } from "@/lib/meters";
import { forwardPending } from "@/lib/vodokanal";

export const dynamic = "force-dynamic";
const MAX_BATCH = 500;

export async function POST(request) {
  const token = await findToken(bearer(request));
  if (!token || (token.kind === "user" && !token.scopes.includes("ingest"))) {
    return NextResponse.json({ ok: false, error: "Invalid or missing token" }, { status: 401 });
  }
  const limit = await rateLimit(`ingest:${token.id}`, INGEST_PER_MINUTE, 60);
  if (!limit.allowed) {
    return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body must be JSON" }, { status: 400 });
  }
  const items = Array.isArray(body) ? body : Array.isArray(body?.readings) ? body.readings : [body];
  if (items.length > MAX_BATCH) {
    return NextResponse.json({ ok: false, error: `At most ${MAX_BATCH} readings per request` }, { status: 413 });
  }

  let accepted = 0, duplicates = 0;
  const errors = [];
  for (const [index, raw] of items.entries()) {
    const parsed = parseReading(raw);
    if (parsed.error) { errors.push({ index, error: parsed.error }); continue; }
    const result = await storeReading(token, parsed);
    if (result.error) errors.push({ index, error: result.error });
    else if (result.duplicate) duplicates++;
    else accepted++;
  }

  if (accepted) await forwardPending({ limit: 20, budgetMs: 8000 }).catch(() => {});
  const status = errors.length && !accepted && !duplicates ? 400 : 200;
  return NextResponse.json({ ok: status === 200, accepted, duplicates, errors }, { status });
}
