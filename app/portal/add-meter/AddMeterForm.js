"use client";
import { useState } from "react";
import Link from "next/link";
import { submitAddMeter } from "@/app/actions/register";

export default function AddMeterForm({ L }) {
  const [modem, setModem] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    const r = await submitAddMeter(modem).catch(() => ({ error: "error" }));
    setBusy(false);
    if (r.ok) setDone(true); else setError(L[r.error] || L.error);
  };
  if (done) return (
    <div className="reg-done"><div className="reg-done-icon">✓</div><h3>{L.done_title}</h3><p>{L.done_text}</p>
      <Link className="btn primary" href="/portal">{L.to_home}</Link></div>
  );
  return (
    <form onSubmit={submit} className="reg-box">
      {error && <div className="banner bad" role="alert">{error}</div>}
      <label className="auth-field"><b>{L.modem}</b><span className="hint">{L.modem_hint}</span>
        <input className="f mono" value={modem} onChange={(e) => setModem(e.target.value)} placeholder="10044321" inputMode="numeric" required autoFocus />
      </label>
      <button className="btn primary" type="submit" disabled={busy}>{busy ? L.sending : L.submit}</button>
    </form>
  );
}
