"use client";
import { useEffect, useState } from "react";
import { soundEnabled, setSoundEnabled, onSoundChange } from "@/lib/sounds";

const ON = '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>';
const OFF = '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6M16 9l6 6"/>';

export default function SoundToggle({ labels, className = "bell" }) {
  const [on, setOn] = useState(true);
  useEffect(() => { setOn(soundEnabled()); return onSoundChange(setOn); }, []);
  return (
    <button type="button" className={className} aria-pressed={on} onClick={() => setSoundEnabled(!on)}
      aria-label={on ? labels.off : labels.on} title={on ? labels.off : labels.on}>
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
        strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: on ? ON : OFF }} />
    </button>
  );
}
