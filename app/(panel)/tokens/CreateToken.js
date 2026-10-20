"use client";
import { useFormState } from "react-dom";
import { createToken } from "@/app/actions/tokens";
import { SubmitButton, CopyButton } from "@/components/client";

export default function CreateToken({ kind, meters, labels }) {
  const [state, action] = useFormState(createToken, null);
  return (
    <form action={action} className="card">
      <h2>{labels.title}</h2>
      <p>{labels.help}</p>
      {state?.token && (
        <div className="banner token" role="status">
          <b>{labels.shownOnce}</b>
          <div className="codebox">{state.token}</div>
          <div><CopyButton text={state.token} label={labels.copy} doneLabel={labels.copied} /></div>
        </div>
      )}
      {state?.error && <div className="banner bad">{labels.required}</div>}
      <input type="hidden" name="kind" value={kind} />
      <div className="form">
        {kind === "meter" ? (
          <label>{labels.meter} *
            <select className="f" name="meter_id" required defaultValue="">
              <option value="" disabled>{labels.choose}</option>
              {meters.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
        ) : (
          <>
            <label>{labels.name} *<input className="f" name="name" required placeholder="Ningbo platform / Vodokanal" /></label>
            <div className="field">{labels.scopes}
              <label className="check"><input type="checkbox" name="scope_ingest" defaultChecked />{labels.scope_ingest}</label>
              <label className="check"><input type="checkbox" name="scope_read" />{labels.scope_read}</label>
            </div>
          </>
        )}
      </div>
      <div className="form-foot"><span /><SubmitButton>{labels.create}</SubmitButton></div>
    </form>
  );
}
