"use client";
import { useEffect, useState } from "react";
import { soundEnabled, setSoundEnabled, onSoundChange } from "@/lib/sounds";

export default function SoundMenuItem({ labels }) {
  const [on, setOn] = useState(true);
  useEffect(() => { setOn(soundEnabled()); return onSoundChange(setOn); }, []);
  return (
    <button type="button" onClick={() => setSoundEnabled(!on)} aria-pressed={on}>
      <span aria-hidden="true" style={{ width: 17, textAlign: "center" }}>{on ? "🔊" : "🔇"}</span>
      {on ? labels.off : labels.on}
    </button>
  );
}
