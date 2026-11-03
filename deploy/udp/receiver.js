// Receives UDP packets from the modems on UDP_PORT. Every packet is saved as-is (hex) in udp_packets;
// CJ/T 188 frames inside it are decoded (decoder.js): readings go to meters/readings like /api/ingest,
// heartbeats get the reply the manual describes. View: admin panel → UDP paketlar, or docker compose logs -f udp
import dgram from "node:dgram";
import postgres from "postgres";
import { findFrames, decodeFrame, heartbeatReply } from "./decoder.js";

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

// Same storage rules as lib/meters.js storeReading: find or register the meter by its number, ignore repeats.
async function storeReading(r) {
  const [meter] = await sql`
    INSERT INTO meters (modem_serial, meter_serial) VALUES (${r.serial}, ${r.serial})
    ON CONFLICT (modem_serial) DO UPDATE SET modem_serial = EXCLUDED.modem_serial
    RETURNING id`;
  const [inserted] = await sql`
    INSERT INTO readings (meter_id, value, measured_at) VALUES (${meter.id}, ${r.forward}, ${r.measuredAt})
    ON CONFLICT (meter_id, measured_at) DO NOTHING RETURNING id`;
  await sql`
    UPDATE meters SET last_value = ${r.forward}, last_seen_at = ${r.measuredAt}, updated_at = now()
    WHERE id = ${meter.id} AND (last_seen_at IS NULL OR last_seen_at <= ${r.measuredAt})`;
  return { meterId: meter.id, duplicate: !inserted };
}

const server = dgram.createSocket("udp4");
server.on("message", async (msg, rinfo) => {
  const remote = `${rinfo.address}:${rinfo.port}`;
  const hex = msg.toString("hex").toUpperCase();
  const decoded = [];
  for (const frame of findFrames(msg)) {
    try {
      const d = decodeFrame(frame);
      if (d.kind === "reading" && d.csOk && !d.error) Object.assign(d, await storeReading(d));
      if (d.kind === "heartbeat") server.send(heartbeatReply(frame), rinfo.port, rinfo.address);
      decoded.push(d);
    } catch (err) {
      decoded.push({ kind: "error", error: err.message });
    }
  }
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
