"use client";
import { useEffect, useRef, useState } from "react";
import { play, preload, soundEnabled, setSoundEnabled, onSoundChange } from "@/lib/sounds";

const PULL_TRIGGER = 28; // px the cord has to travel to switch the lamp
const PULL_MAX = 80;
const CLICK_PULL = 48;   // how far a plain click pulls the cord before letting go
// Damped spring for the cord's bounce back, and a slower one for its sideways sway.
const SPRING = { k: 260, c: 7.5, min: -26 };
const SWAY = { k: 55, c: 2.2 };

export default function LampScene({ labels, children }) {
  const [on, setOn] = useState(false);
  const [sound, setSound] = useState(true);
  const cord = useRef(null);
  const card = useRef(null);
  const drag = useRef(null);
  const anim = useRef(0);
  const state = useRef({ pull: 0, v: 0, swing: 0, sv: 0 });
  const firstRun = useRef(true);
  const reduced = useRef(false);

  useEffect(() => {
    preload();
    setSound(soundEnabled());
    reduced.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const off = onSoundChange(setSound);
    return () => { off(); cancelAnimationFrame(anim.current); };
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

  const paint = () => {
    const s = state.current;
    cord.current?.style.setProperty("--pull", `${s.pull.toFixed(2)}px`);
    cord.current?.style.setProperty("--swing", `${s.swing.toFixed(2)}deg`);
  };

  const onRef = useRef(false);
  useEffect(() => { onRef.current = on; }, [on]);
  const toggle = () => {
    const next = !onRef.current;
    onRef.current = next;
    play(next ? "lampOn" : "lampOff");
    setOn(next);
  };

  // Let go: the cord springs back up past its rest point, drops again and settles, swaying a little.
  const release = (kick = 0) => {
    cancelAnimationFrame(anim.current);
    const s = state.current;
    if (reduced.current) { Object.assign(s, { pull: 0, v: 0, swing: 0, sv: 0 }); paint(); return; }
    s.sv += kick;
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      s.v += (-SPRING.k * s.pull - SPRING.c * s.v) * dt;
      s.pull += s.v * dt;
      if (s.pull < SPRING.min) { s.pull = SPRING.min; s.v = Math.abs(s.v) * 0.4; }
      s.sv += (-SWAY.k * s.swing - SWAY.c * s.sv) * dt;
      s.swing += s.sv * dt;
      paint();
      const resting = Math.abs(s.pull) < 0.15 && Math.abs(s.v) < 2 && Math.abs(s.swing) < 0.05 && Math.abs(s.sv) < 0.2;
      if (resting) { Object.assign(s, { pull: 0, v: 0, swing: 0, sv: 0 }); paint(); return; }
      anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  };

  // A click or Enter: pull the cord down quickly, switch, then let it bounce back.
  const autoPull = () => {
    cancelAnimationFrame(anim.current);
    const s = state.current;
    if (reduced.current) { toggle(); return; }
    const from = s.pull, start = performance.now(), dur = 150;
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      s.pull = from + (CLICK_PULL - from) * (1 - (1 - p) ** 3);
      s.v = 0;
      paint();
      if (p < 1) { anim.current = requestAnimationFrame(step); return; }
      toggle();
      release((Math.random() < 0.5 ? -1 : 1) * 14);
    };
    anim.current = requestAnimationFrame(step);
  };

  const onDown = (e) => {
    cancelAnimationFrame(anim.current);
    drag.current = { y: e.clientY - state.current.pull, x: e.clientX, moved: false, lastY: e.clientY, lastT: performance.now(), vy: 0 };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const pull = Math.max(0, Math.min(PULL_MAX, e.clientY - d.y));
    if (Math.abs(e.clientY - d.lastY) > 0 || pull > 4) d.moved = d.moved || pull > 4;
    const now = performance.now();
    d.vy = (e.clientY - d.lastY) / Math.max(1, now - d.lastT) * 1000;
    d.lastY = e.clientY; d.lastT = now;
    const s = state.current;
    s.pull = pull;
    s.swing = Math.max(-8, Math.min(8, (e.clientX - d.x) * -0.12));
    paint();
  };
  const onUp = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    if (!d.moved) { autoPull(); return; }
    const s = state.current;
    if (s.pull >= PULL_TRIGGER) toggle();
    s.v = Math.min(0, -d.vy * 0.2);
    release(s.swing * -2);
  };

  return (
    <div className={`lamp-scene${on ? " is-on" : ""}`}>
      <div className="lamp-glow" aria-hidden="true" />
      <button type="button" className="lamp-sound" onClick={() => setSoundEnabled(!sound)} aria-pressed={sound}
        aria-label={sound ? labels.soundOff : labels.soundOn} title={sound ? labels.soundOff : labels.soundOn}>
        {sound ? "🔊" : "🔇"}
      </button>

      <div className="lamp-stage">
        <div className="lamp">
          <div className="lamp-shade"><span className="lamp-bulb" /></div>
          <div className="lamp-beam" aria-hidden="true" />
          <div className="lamp-stem" />
          <div className="lamp-base" />
          <div className="lamp-cord" ref={cord}>
            <span className="lamp-line" />
            <button type="button" className="lamp-knob" aria-pressed={on}
              aria-label={on ? labels.off : labels.on}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); autoPull(); } }} />
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
