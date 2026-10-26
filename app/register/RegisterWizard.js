"use client";
import { useState } from "react";
import Link from "next/link";
import { checkModem, submitRegistration } from "@/app/actions/register";

const STEPS = 2;

// Two steps: check the modem number, then everything else on one page.
export default function RegisterWizard({ L, regions }) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const [f, setF] = useState({ modem: "", kind: "individual", name: "", phone: "", inn: "", pinfl: "", region: "", district: "", street: "", house: "", cadastr_number: "", password: "", password2: "" });
  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }));

  const check = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    const r = await checkModem(f.modem).catch(() => ({ status: "error" }));
    setBusy(false);
    if (r.status === "ok") { setF((v) => ({ ...v, modem: r.modem })); setStep(2); }
    else setError(L[`modem_${r.status}`] || L.error);
  };
  const submit = async (e) => {
    e.preventDefault(); setError("");
    if (f.kind === "legal" && !/^\d{9}$/.test(f.inn)) return setError(L.bad_inn);
    if (f.pinfl && !/^\d{14}$/.test(f.pinfl)) return setError(L.bad_pinfl);
    if (f.password !== f.password2) return setError(L.password_mismatch);
    setBusy(true);
    const r = await submitRegistration(f).catch(() => ({ error: "error" }));
    setBusy(false);
    if (r.ok) setDone(r);
    else setError(L[r.error] || L.error);
  };

  if (done) return (
    <div className="reg-done">
      <div className="reg-done-icon">✓</div>
      <h3>{L.done_title}</h3>
      <p>{L.done_text}</p>
      <div className="reg-login"><span>{L.your_login}</span><b className="mono">{done.login}</b></div>
      <Link className="btn primary" href="/login">{L.to_login}</Link>
    </div>
  );

  const field = (k, label, props = {}) => (
    <label className="auth-field">{label}{props.required ? " *" : ""}
      <input className="f" value={f[k]} onChange={set(k)} {...props} />
      {props.hint && <span className="hint">{props.hint}</span>}
    </label>
  );

  return (
    <div className="reg">
      {step > 1 && (
        <div className="reg-steps" aria-label={L.step_of.replace("{n}", step).replace("{total}", STEPS)}>
          {[1, 2].map((n) => <span key={n} className={n <= step ? "on" : ""} />)}
          <small>{L.step_of.replace("{n}", step).replace("{total}", STEPS)}</small>
        </div>
      )}
      {error && <div className="banner bad" role="alert">{error}</div>}

      {step === 1 && (
        <form onSubmit={check} className="reg-box">
          <label className="auth-field"><b>{L.modem}</b><span className="hint">{L.modem_hint}</span>
            <input className="f mono" value={f.modem} onChange={set("modem")} placeholder="10044321" inputMode="numeric" required autoFocus />
          </label>
          <button className="btn primary" type="submit" disabled={busy}>🔍 {busy ? L.checking : L.check}</button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={submit} className="reg-box">
          <div className="reg-found">✓ {L.modem_found} <b className="mono">{f.modem}</b> · {L.login_will_be} <b className="mono">{f.modem}</b></div>
          <div className="reg-kind" role="radiogroup" aria-label={L.who}>
            {["individual", "legal"].map((k) => (
              <button key={k} type="button" role="radio" aria-checked={f.kind === k} className={`btn ${f.kind === k ? "primary" : ""}`}
                onClick={() => setF((v) => ({ ...v, kind: k }))}>{L[k]}</button>
            ))}
          </div>
          {field("name", f.kind === "legal" ? L.company_name : L.full_name, { required: true, autoFocus: true })}
          <div className="reg-grid">
            {field("phone", L.phone, { required: true, type: "tel", placeholder: "+998 90 123 45 67" })}
            {f.kind === "legal"
              ? field("inn", L.inn, { required: true, inputMode: "numeric", maxLength: 9, placeholder: "305081846" })
              : field("pinfl", L.pinfl, { inputMode: "numeric", maxLength: 14 })}
            <label className="auth-field">{L.region} *
              <input className="f" list="reg-regions" value={f.region} onChange={set("region")} required />
              <datalist id="reg-regions">{regions.map((r) => <option key={r} value={r} />)}</datalist>
            </label>
            {field("district", L.district)}
            {field("street", L.street, { required: true })}
            {field("house", L.house)}
            {field("cadastr_number", L.cadastr_number, { className: "f mono" })}
            {field("password", L.password, { required: true, type: "password", autoComplete: "new-password" })}
            {field("password2", L.password2, { required: true, type: "password", autoComplete: "new-password" })}
          </div>
          <span className="hint" style={{ marginTop: -6 }}>{L.password_rule}</span>
          <div className="reg-nav"><button type="button" className="btn" onClick={() => { setError(""); setStep(1); }}>{L.back}</button>
            <button className="btn primary" type="submit" disabled={busy}>{busy ? L.sending : L.submit}</button></div>
        </form>
      )}
    </div>
  );
}
