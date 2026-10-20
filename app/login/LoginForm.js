"use client";
import { useFormState } from "react-dom";
import { login } from "@/app/actions/auth";
import { SubmitButton } from "@/components/client";

export default function LoginForm({ labels }) {
  const [state, action] = useFormState(login, null);
  return (
    <form action={action} className="form" style={{ gridTemplateColumns: "1fr" }}>
      {state?.error && <div className="banner bad" role="alert">{labels[state.error]}</div>}
      <label>{labels.phone}<input className="f mono" name="phone" type="tel" autoComplete="username" placeholder="+998 90 123 45 67" required /></label>
      <label>{labels.password}<input className="f" name="password" type="password" autoComplete="current-password" required /></label>
      <SubmitButton className="btn primary" style={{ justifyContent: "center" }}>{labels.submit}</SubmitButton>
    </form>
  );
}
