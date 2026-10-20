// Daily Vercel Cron job (see vercel.json): retries readings that failed to reach Vodokanal
// and posts an offline-meter summary to Telegram.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { forwardPending } from "@/lib/vodokanal";
import { sendTelegram } from "@/lib/telegram";
import { STATUS_SQL } from "@/lib/meters";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  let sent = 0, failed = 0, paused = false;
  for (let i = 0; i < 20; i++) {
    const r = await forwardPending({ limit: 500 });
    paused = r.paused; sent += r.sent; failed += r.failed;
    if (r.paused || r.sent === 0) break;
  }
  const sql = await db();
  const [{ offline }] = await sql.unsafe(`
    SELECT count(*)::int AS offline FROM meters m LEFT JOIN models md ON md.id = m.model_id
    WHERE ${STATUS_SQL} = 'offline'`);
  if (offline) await sendTelegram(`📡 UZLITR: ${offline} ta hisoblagich oflayn.`).catch(() => {});
  return NextResponse.json({ ok: true, paused, sent, failed, offline });
}
