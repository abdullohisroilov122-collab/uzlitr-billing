// Client-side sound engine: small MP3s decoded once into Web Audio buffers, so clicks play instantly.
// One on/off preference for the whole site, kept in the browser.
const FILES = { tap: "/sounds/tap.mp3", lampOn: "/sounds/lamp-on.mp3", lampOff: "/sounds/lamp-off.mp3" };
const GAIN = { tap: 0.32, lampOn: 0.9, lampOff: 0.9 };
const KEY = "uzlitr_sound";

let ctx = null;
const buffers = {};
const listeners = new Set();
let loading = null;

function context() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function preload() {
  if (loading) return loading;
  const ac = context();
  if (!ac) return Promise.resolve();
  loading = Promise.all(Object.entries(FILES).filter(([name]) => !buffers[name]).map(async ([name, url]) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url}: ${res.status}`);
      buffers[name] = await ac.decodeAudioData(await res.arrayBuffer());
    } catch {}
  })).then(() => {
    // Let a later call try again for anything that failed (e.g. a dropped connection).
    if (Object.keys(FILES).some((name) => !buffers[name])) loading = null;
  });
  return loading;
}

export function soundEnabled() {
  try {
    const v = localStorage.getItem(KEY) ?? localStorage.getItem("uzlitr_lamp_sound");
    return v !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on) {
  try { localStorage.setItem(KEY, on ? "on" : "off"); } catch {}
  listeners.forEach((fn) => fn(on));
}

export function onSoundChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function play(name) {
  if (!soundEnabled()) return;
  const ac = context();
  if (!ac) return;
  if (ac.state === "suspended") ac.resume();
  const buf = buffers[name];
  if (!buf) { preload(); return; }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const g = ac.createGain();
  g.gain.value = GAIN[name] ?? 0.5;
  src.connect(g).connect(ac.destination);
  src.start();
}
