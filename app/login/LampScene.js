"use client";
import { useEffect, useRef, useState } from "react";

const PULL_TRIGGER = 28; // px the cord has to travel to switch the lamp
const PULL_MAX = 70;
const SOUND_KEY = "uzlitr_lamp_sound";

// Pull-chain "click-clack" and a soft hum when the light comes on, synthesised with Web Audio (no audio files).
function useLampSound() {
  const ctxRef = useRef(null);
  const ctx = () => {
    if (!ctxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctxRef.current = new AC();
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  };
  const tick = (ac, at, freq, gain) => {
    // a short burst of filtered noise plus a quick ping: the metallic "tk" of a pull switch
    const len = Math.floor(ac.sampleRate * 0.03);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 4;
    const noise = ac.createBufferSource(); noise.buffer = buf;
    const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = 4;
    const g = ac.createGain(); g.gain.setValueAtTime(gain, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    noise.connect(bp).connect(g).connect(ac.destination); noise.start(at);
    const osc = ac.createOscillator(); osc.type = "triangle"; osc.frequency.setValueAtTime(freq * 0.9, at);
    const og = ac.createGain(); og.gain.setValueAtTime(gain * 0.35, at); og.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
    osc.connect(og).connect(ac.destination); osc.start(at); osc.stop(at + 0.07);
  };
  const hum = (ac, at) => {
    // warm swell as the bulb lights
    const osc = ac.createOscillator(); osc.type = "sine"; osc.frequency.setValueAtTime(110, at); osc.frequency.linearRampToValueAtTime(165, at + 0.35);
    const osc2 = ac.createOscillator(); osc2.type = "sine"; osc2.frequency.setValueAtTime(330, at); osc2.frequency.linearRampToValueAtTime(495, at + 0.35);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.05, at + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.6);
    const g2 = ac.createGain(); g2.gain.value = 0.35;
    osc.connect(g); osc2.connect(g2).connect(g); g.connect(ac.destination);
    osc.start(at); osc2.start(at); osc.stop(at + 0.62); osc2.stop(at + 0.62);
  };
  return {
    pull(turningOn) {
      const ac = ctx(); if (!ac) return;
      const t = ac.currentTime + 0.005;
      tick(ac, t, 2600, 0.5);           // chain pulled
      tick(ac, t + 0.11, 1800, 0.35);   // switch snaps back
      if (turningOn) hum(ac, t + 0.12);
    }
  };
}

export default function LampScene({ labels, children }) {
  const [on, setOn] = useState(false);
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [sound, setSound] = useState(true);
  const start = useRef(null);
  const audio = useLampSound();

  const card = useRef(null);
  const firstRun = useRef(true);

  useEffect(() => {
    try { if (localStorage.getItem(SOUND_KEY) === "off") setSound(false); } catch {}
  }, []);

  // Once the light is on, put the cursor in the first empty field.
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    if (!on) return;
    const id = setTimeout(() => {
      const field = [...(card.current?.querySelectorAll("input:not([type=hidden])") || [])].find((i) => !i.value);
      field?.focus();
    }, 450);
    return () => clearTimeout(id);
  }, [on]);

  // A sign-in message must never sit in the dark: turn the lamp on when one appears.
  useEffect(() => {
    if (!card.current) return;
    const watch = new MutationObserver(() => { if (card.current.querySelector("[role=alert]")) setOn(true); });
    watch.observe(card.current, { childList: true, subtree: true });
    return () => watch.disconnect();
  }, []);

  const toggle = () => {
    setOn((v) => {
      if (sound) audio.pull(!v);
      return !v;
    });
  };
  const flipSound = () => {
    setSound((v) => {
      try { localStorage.setItem(SOUND_KEY, v ? "off" : "on"); } catch {}
      return !v;
    });
  };

  const onDown = (e) => {
    start.current = { y: e.clientY, moved: false };
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (!start.current) return;
    const dy = Math.max(0, Math.min(PULL_MAX, e.clientY - start.current.y));
    if (dy > 4) start.current.moved = true;
    setPull(dy);
  };
  const onUp = () => {
    if (!start.current) return;
    const { moved } = start.current;
    if (!moved || pull >= PULL_TRIGGER) toggle();
    start.current = null;
    setDragging(false);
    setPull(0);
  };

  return (
    <div className={`lamp-scene${on ? " is-on" : ""}`}>
      <div className="lamp-glow" aria-hidden="true" />
      <button type="button" className="lamp-sound" onClick={flipSound} aria-pressed={sound}
        aria-label={sound ? labels.soundOff : labels.soundOn} title={sound ? labels.soundOff : labels.soundOn}>
        {sound ? "🔊" : "🔇"}
      </button>

      <div className="lamp-stage">
        <div className="lamp" aria-hidden="false">
          <div className="lamp-shade"><span className="lamp-bulb" /></div>
          <div className="lamp-beam" aria-hidden="true" />
          <div className="lamp-stem" />
          <div className="lamp-base" />
          <div className={`lamp-cord${dragging ? " dragging" : ""}`} style={{ "--pull": `${pull}px` }}>
            <span className="lamp-line" />
            <button type="button" className="lamp-knob" aria-pressed={on}
              aria-label={on ? labels.off : labels.on}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }} />
          </div>
          {!on && <p className="lamp-hint">{labels.hint}<span aria-hidden="true"> ↓</span></p>}
        </div>

        <div className="lamp-card" ref={card} inert={on ? undefined : ""} aria-hidden={!on}>
          {children}
        </div>
      </div>
    </div>
  );
}
