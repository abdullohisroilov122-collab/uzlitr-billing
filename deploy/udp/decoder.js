// Decoder for the meter's CJ/T 188 frames ("NB-IoT 188B Protocol" from the manufacturer):
//   [FE FE FE] 68 T A0..A5 A6 V C L DATA CS 16
// A0..A5 = meter number (BCD, low byte first; A5 is the vendor code), A6 = sum of A0..A5,
// CS = sum of all bytes from 68 up to CS (mod 256). Numbers in the data field are little-endian binary.

const VOLUME_DECIMALS = { 0x27: 7, 0x28: 6, 0x29: 5, 0x2a: 4, 0x2b: 3, 0x2c: 2 }; // unit codes for m³ totals
const FLOW_DECIMALS = { 0x35: 2, 0x36: 1, 0x37: 0 }; // m³/h

const le = (b, i, n) => { let v = 0; for (let k = n - 1; k >= 0; k--) v = v * 256 + b[i + k]; return v; };
const hex = (b) => Buffer.from(b).toString("hex").toUpperCase();
const bit = (byte, n) => ((byte >> n) & 1) === 1;

// Finds every complete frame in a packet (a packet may carry extra bytes or several frames).
// A frame with a wrong checksum is still returned, marked csOk = false (the manufacturer's own heartbeat
// example has one), so it is kept and visible instead of silently dropped.
export function findFrames(buf) {
  const frames = [];
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== 0x68 || i + 13 > buf.length) continue;
    const len = buf[i + 11];
    const end = i + 12 + len; // index of CS
    if (end + 1 >= buf.length || buf[end + 1] !== 0x16) continue;
    let sum = 0;
    for (let k = i; k < end; k++) sum = (sum + buf[k]) & 0xff;
    const frame = buf.subarray(i, end + 2);
    frame.csOk = sum === buf[end];
    frames.push(frame);
    i = end + 1;
  }
  return frames;
}

function meterTime(b, i, now) {
  const [s, mi, h, d, mo] = [b[i], b[i + 1], b[i + 2], b[i + 3], b[i + 4]];
  const y = le(b, i + 5, 2);
  const text = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")} ${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  // The meter's clock is local (Tashkent, UTC+5). Fall back to the receive time if it is unset or far off.
  const date = new Date(`${text.replace(" ", "T")}+05:00`);
  const ok = !Number.isNaN(date.getTime()) && y >= 2020 && Math.abs(date - now) < 7 * 864e5;
  return { text, date: ok ? date : now, clockOk: ok };
}

function status(st) {
  return {
    valve: bit(st[0], 0) ? "closed" : "open",
    lowBattery: bit(st[0], 1) || bit(st[1], 1),
    tamper: bit(st[0], 4), // on HyZim pulse readers: the pulse line to the meter is disconnected
    meteringFault: bit(st[0], 7),
    valveFault: bit(st[1], 0),
    reverseFlow: bit(st[1], 2),
    sensorFault: bit(st[1], 3),
    valveLeak: bit(st[1], 4),
    pressureAbnormal: bit(st[1], 5),
    flowAbnormal: bit(st[1], 6),
    pipeLeak: bit(st[2], 3),
    magnet: bit(st[2], 2) || bit(st[2], 5)
  };
}

// Meter alarms worth telling people about, as short codes (translated in the app as alarm_<code>).
export function alarmCodes(st) {
  if (!st) return [];
  const codes = [];
  if (st.tamper) codes.push("pulse_cut");
  if (st.magnet) codes.push("magnet");
  if (st.pipeLeak || st.valveLeak) codes.push("leak");
  if (st.reverseFlow) codes.push("reverse_flow");
  if (st.sensorFault || st.meteringFault) codes.push("sensor_fault");
  if (st.valveFault) codes.push("valve_fault");
  if (st.lowBattery) codes.push("low_battery");
  return codes;
}

export function decodeFrame(f, now = new Date()) {
  const type = f[1];
  // Meter number as printed on the label: all 7 address bytes A6..A0 (A6, the check byte, gives the first two
  // digits), e.g. 62062026110401.
  const serial = hex(Buffer.from(f.subarray(2, 9)).reverse());
  const control = f[10], len = f[11], data = f.subarray(12, 12 + len); // f[8] = A6, f[9] = version
  const di = len >= 2 ? hex(data.subarray(0, 2)) : null;
  const base = { type, serial, control, di, reply: bit(control, 7), error: bit(control, 6), csOk: f.csOk !== false };

  if (di === "901E" && len >= 32) {
    const dec = VOLUME_DECIMALS[data[6]] ?? 2;
    const time = meterTime(data, 20, now);
    return {
      ...base, kind: "reading",
      forward: le(data, 2, 4) / 10 ** dec,
      reverse: le(data, 7, 4) / 10 ** (VOLUME_DECIMALS[data[11]] ?? 2),
      remaining: (le(data, 12, 4) | 0) / 100,
      flow: le(data, 16, 3) / 10 ** (FLOW_DECIMALS[data[19]] ?? 2),
      meterTime: time.text, measuredAt: time.date, clockOk: time.clockOk,
      status: status(data.subarray(27, 31)), statusHex: hex(data.subarray(27, 31)), order: data[31]
    };
  }
  // HyZim's DI 905F upload (layout from the manufacturer's "NB-IoT protocol case"): units (forward, reverse,
  // flow), spare, forward total (4), remaining amount (4), status (3) + battery ×0.1 V (1), recharge ID,
  // reverse total (4), instantaneous flow (4), pressure, 24 hourly totals of 5 bytes, signal, SNR.
  // No clock in the packet: the receive time is used.
  if (di === "905F" && len >= 28) {
    const int8 = (v) => (v > 127 ? v - 256 : v);
    return {
      ...base, kind: "reading",
      forward: le(data, 6, 4) / 10 ** (VOLUME_DECIMALS[data[2]] ?? 3),
      remaining: (le(data, 10, 4) | 0) / 100,
      battery: data[17] ? data[17] / 10 : null,
      reverse: le(data, 19, 4) / 10 ** (VOLUME_DECIMALS[data[3]] ?? 3),
      flow: le(data, 23, 4) / 10 ** (FLOW_DECIMALS[data[4]] ?? 2),
      pressure: data[27],
      signal: len >= 150 ? int8(data[148]) : null,
      snr: len >= 150 ? int8(data[149]) : null,
      measuredAt: now, meterTime: null, clockOk: false,
      status: status(Buffer.from([data[14], data[15], data[16], 0])), statusHex: hex(data.subarray(14, 17))
    };
  }
  if (di === "A026" && len >= 9) {
    const time = meterTime(data, 2, now);
    return { ...base, kind: "heartbeat", meterTime: time.text };
  }
  return { ...base, kind: "other", dataHex: hex(data) };
}

// Server reply to a heartbeat: same type and address, control 84H, DI A026 and the 2-byte code 12 34 (as in the manual).
export function heartbeatReply(f) {
  const body = Buffer.from([0x68, f[1], ...f.subarray(2, 9), 0x00, 0x84, 0x04, 0xa0, 0x26, 0x12, 0x34]);
  let sum = 0; for (const b of body) sum = (sum + b) & 0xff;
  return Buffer.concat([Buffer.from([0xfe, 0xfe, 0xfe]), body, Buffer.from([sum, 0x16])]);
}
