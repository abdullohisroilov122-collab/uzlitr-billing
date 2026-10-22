"use client";
import { useEffect } from "react";
import { play, preload } from "@/lib/sounds";

// Everything that acts like a button gets the pull-switch "tick" when pressed.
const CLICKABLE = "button, .btn, summary, .tabs a, .nav a, .menu-pop a, a.kpi, .hero .go, tr.clickable, .link, .lang-opt";
const SILENT = ".lamp-knob, [data-silent], :disabled, [aria-disabled='true']";

export default function SoundEffects() {
  useEffect(() => {
    preload();
    // Mouse and touch: sound on press, so it feels instant. Keyboard: on Enter/Space activation.
    const onPointer = (e) => {
      if (e.button !== 0) return;
      const el = e.target.closest(CLICKABLE);
      if (el && !el.closest(SILENT) && !el.matches(SILENT)) play("tap");
    };
    const onKey = (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const el = e.target.closest?.(CLICKABLE);
      if (el && el === e.target && !el.matches(SILENT)) play("tap");
    };
    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, []);
  return null;
}
