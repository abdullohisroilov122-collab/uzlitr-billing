"use client";
import { useState } from "react";
import { useFormState } from "react-dom";
import { login } from "@/app/actions/auth";
import { SubmitButton } from "@/components/client";

const svg = (d) => (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />
);
const USER = '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>';
const LOCK = '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>';
const EYE = '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>';
const EYE_OFF = '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.8-1.3M9.9 9.9a3 3 0 0 0 4.2 4.2"/>';

// door="customer": login (modem number or phone), show-password, remember me. door="staff": phone + password.
export default function LoginForm({ labels, door = "customer" }) {
  const [state, action] = useFormState(login, null);
  const [show, setShow] = useState(false);
  const customer = door === "customer";
  return (
    <form action={action} className={customer ? "auth-form" : "form"} style={customer ? undefined : { gridTemplateColumns: "1fr" }}>
      <input type="hidden" name="door" value={door} />
      {state?.error && <div className="banner bad" role="alert">{labels[state.error]}</div>}
      {customer ? (
        <>
          <label className="auth-field">{labels.login}
            <span className="auth-input">{svg(USER)}<input name="login" autoComplete="username" placeholder={labels.loginPh} required /></span>
          </label>
          <label className="auth-field">{labels.password}
            <span className="auth-input">{svg(LOCK)}
              <input name="password" type={show ? "text" : "password"} autoComplete="current-password" placeholder="••••••••" required />
              <button type="button" className="auth-eye" onClick={() => setShow((v) => !v)} aria-label={show ? labels.hide : labels.show} data-silent>
                {svg(show ? EYE_OFF : EYE)}
              </button>
            </span>
          </label>
          <label className="auth-check"><input type="checkbox" name="remember" />{labels.remember}</label>
        </>
      ) : (
        <>
          <label>{labels.phone}<input className="f mono" name="phone" type="tel" autoComplete="username" placeholder="+998 90 123 45 67" required /></label>
          <label>{labels.password}<input className="f" name="password" type="password" autoComplete="current-password" required /></label>
        </>
      )}
      <SubmitButton className="btn primary" style={{ justifyContent: "center" }}>{labels.submit}</SubmitButton>
    </form>
  );
}
