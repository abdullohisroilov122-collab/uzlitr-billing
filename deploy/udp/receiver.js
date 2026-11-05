// Receives UDP packets from the modems on UDP_PORT. Every packet is saved as-is (hex) in udp_packets;
// CJ/T 188 frames inside it are decoded (decoder.js): readings go to meters/readings like /api/ingest,
// heartbeats get the reply the manual describes. View: admin panel → UDP paketlar, or docker compose logs -f udp
import dgram from "node:dgram";
import postgres from "postgres";
import { findFrames, decodeFrame, heartbeatReply, alarmCodes } from "./decoder.js";

const PORT = Number(process.env.UDP_PORT || 45370);
const sql = postgres(process.env.DATABASE_URL, { max: 2, onnotice: () => {} });

await sql`
  CREATE TABLE IF NOT EXISTS udp_packets (
    id          BIGSERIAL PRIMARY KEY,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    remote      TEXT NOT NULL,
    size        INTEGER NOT NULL,
    hex         TEXT NOT NULL
  )`;
await sql`ALTER TABLE udp_packets ADD COLUMN IF NOT EXISTS decoded JSONB`;
await sql`CREATE INDEX IF NOT EXISTS udp_packets_time ON udp_packets (received_at DESC)`;
await sql`ALTER TABLE meters ADD COLUMN IF NOT EXISTS alarms TEXT[] NOT NULL DEFAULT '{}'`;
await sql`ALTER TABLE meters ADD COLUMN IF NOT EXISTS alarms_at TIMESTAMPTZ`;

const ALARM_TEXT = {
  pulse_cut: "impuls kabeli uzilgan 🔌", magnet: "magnit ta'siri 🧲", leak: "suv oqishi 💦",
  reverse_flow: "teskari oqim ↩️", sensor_fault: "datchik nosozligi", valve_fault: "klapan nosozligi", low_battery: "batareya past 🔋"
};

// Same Telegram settings as the app (Settings → Telegram); silently skipped when not set up.
async function sendTelegram(text) {
  try {
    const [row] = await sql`SELECT value FROM settings WHERE key = 'telegram'`;
    const cfg = row?.value || {};
    if (!cfg.enabled || !cfg.botToken || !cfg.chatId) return;
    await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: cfg.chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(10000)
    });
  } catch (err) {
    console.error("telegram failed:", err.message);
  }
}

// Same storage rules as lib/meters.js storeReading: find or register the meter by its number, ignore repeats.
async function storeReading(r) {
  const [meter] = await sql`
    INSERT INTO meters (modem_serial, meter_serial) VALUES (${r.serial}, ${r.serial})
    ON CONFLICT (modem_serial) DO UPDATE SET modem_serial = EXCLUDED.modem_serial
    RETURNING id`;
  const [inserted] = await sql`
    INSERT INTO readings (meter_id, value, battery, signal, measured_at)
    VALUES (${meter.id}, ${r.forward}, ${r.battery ?? null}, ${r.signal ?? null}, ${r.measuredAt})
    ON CONFLICT (meter_id, measured_at) DO NOTHING RETURNING id`;
  // The newest reading decides the meter's current alarms; a Telegram goes out only for alarms that just appeared.
  const alarms = alarmCodes(r.status);
  const [before] = await sql`SELECT alarms FROM meters WHERE id = ${meter.id}`;
  const [updated] = await sql`
    UPDATE meters SET last_value = ${r.forward}, last_battery = coalesce(${r.battery ?? null}, last_battery),
      last_signal = coalesce(${r.signal ?? null}, last_signal),
      last_seen_at = ${r.measuredAt}, updated_at = now(),
      alarms = ${alarms}, alarms_at = CASE WHEN ${alarms.length > 0} THEN coalesce(alarms_at, now()) ELSE NULL END
    WHERE id = ${meter.id} AND (last_seen_at IS NULL OR last_seen_at <= ${r.measuredAt})
    RETURNING id`;
  const fresh = updated ? alarms.filter((a) => !(before?.alarms || []).includes(a)) : [];
  return { meterId: meter.id, duplicate: !inserted, alarms, newAlarms: fresh };
}

// Decodes one packet; readings are stored, heartbeats answered (when a reply address is given).
async function handle(msg, receivedAt, reply) {
  const decoded = [];
  for (const frame of findFrames(msg)) {
    try {
      const d = decodeFrame(frame, receivedAt);
      if (d.kind === "reading" && d.csOk && !d.error) {
        Object.assign(d, await storeReading(d));
        // Live packets only: re-checked old packets don't send messages.
        if (reply && d.newAlarms.length) {
          await sendTelegram(`⚠️ UZLITR: hisoblagich ${d.serial}\n${d.newAlarms.map((a) => "• " + ALARM_TEXT[a]).join("\n")}\n${d.forward} m³`);
        }
      }
      if (d.kind === "heartbeat" && reply) reply(heartbeatReply(frame));
      decoded.push(d);
    } catch (err) {
      decoded.push({ kind: "error", error: err.message });
    }
  }
  return decoded;
}

// Packets saved before the decoder knew their format are decoded again on start, with their receive time.
const old = await sql`
  SELECT id, hex, received_at FROM udp_packets
  WHERE decoded IS NULL OR NOT decoded @> '[{"kind": "reading"}]'::jsonb ORDER BY id`;
for (const p of old) {
  const decoded = await handle(Buffer.from(p.hex, "hex"), p.received_at, null);
  if (decoded.some((d) => d.kind === "reading")) await sql`UPDATE udp_packets SET decoded = ${sql.json(decoded)} WHERE id = ${p.id}`;
}
if (old.length) console.log(`re-checked ${old.length} saved packets`);

const server = dgram.createSocket("udp4");
server.on("message", async (msg, rinfo) => {
  const remote = `${rinfo.address}:${rinfo.port}`;
  const hex = msg.toString("hex").toUpperCase();
  const decoded = await handle(msg, new Date(), (buf) => server.send(buf, rinfo.port, rinfo.address));
  const summary = decoded.map((d) => (d.kind === "reading" ? `${d.serial} ${d.forward}m3` : d.kind)).join(", ");
  console.log(`${new Date().toISOString()} ${remote} ${msg.length}B ${summary || "no frame"} ${hex}`);
  try {
    await sql`INSERT INTO udp_packets (remote, size, hex, decoded)
              VALUES (${remote}, ${msg.length}, ${hex}, ${decoded.length ? sql.json(decoded) : null})`;
  } catch (err) {
    console.error("save failed:", err.message);
  }
});
server.on("error", (err) => { console.error(err); process.exit(1); });
server.bind(PORT, () => console.log(`UDP listening on ${PORT}`));
