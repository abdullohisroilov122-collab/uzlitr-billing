// Receives UDP packets from the modems and saves each one as-is (hex) in the database, so nothing is lost
// while the modem protocol is being decoded. Packets can be viewed in the admin panel (UDP paketlar)
// or with: docker compose logs -f udp
import dgram from "node:dgram";
import postgres from "postgres";

const PORT = Number(process.env.UDP_PORT || 45370);
const sql = postgres(process.env.DATABASE_URL, { max: 2 });

await sql`
  CREATE TABLE IF NOT EXISTS udp_packets (
    id          BIGSERIAL PRIMARY KEY,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    remote      TEXT NOT NULL,
    size        INTEGER NOT NULL,
    hex         TEXT NOT NULL
  )`;
await sql`CREATE INDEX IF NOT EXISTS udp_packets_time ON udp_packets (received_at DESC)`;

const server = dgram.createSocket("udp4");
server.on("message", async (msg, rinfo) => {
  const remote = `${rinfo.address}:${rinfo.port}`;
  const hex = msg.toString("hex").toUpperCase();
  console.log(`${new Date().toISOString()} ${remote} ${msg.length}B ${hex}`);
  try {
    await sql`INSERT INTO udp_packets (remote, size, hex) VALUES (${remote}, ${msg.length}, ${hex})`;
  } catch (err) {
    console.error("save failed:", err.message);
  }
});
server.on("error", (err) => { console.error(err); process.exit(1); });
server.bind(PORT, () => console.log(`UDP listening on ${PORT}`));
