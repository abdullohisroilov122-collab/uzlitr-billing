"use client";
import { useEffect, useState } from "react";

const ACTIVITY = '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>';
const X = '<path d="M6 6l12 12M18 6 6 18"/>';
const svg = (d, size = 18) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />
);

// Rows arrive pre-formatted from the server, so client and server render identical text.
export default function ReadingsTable({ rows, labels, showForward, offset = 0 }) {
  const [open, setOpen] = useState(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <table>
        <thead><tr>
          <th style={{ width: 60 }}>№</th><th>{labels.date}</th><th className="right">{labels.reading}</th>
          <th className="right">{labels.usage}</th><th>{labels.signal}</th><th className="right">{labels.battery}</th>
          {showForward && <th>{labels.forwarded}</th>}
        </tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={r.id} className="clickable" tabIndex={0} onClick={() => setOpen(r)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(r))}>
            <td className="muted num">{offset + i + 1}</td>
            <td className="num">{r.date}</td>
            <td className="right num"><b>{r.value}</b></td>
            <td className="right num">{r.used}</td>
            <td>{r.signal === "—" ? "—" : <span className="chip c-ok">{svg(ACTIVITY, 13)}{r.signal}</span>}</td>
            <td className="right num">{r.battery}</td>
            {showForward && <td><span className={`chip ${r.forwardCls}`} title={r.forwardError || undefined}>{r.forward}</span></td>}
          </tr>))}
        </tbody>
      </table>
      {open && (
        <div className="scrim" onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="reading-title">
            <div className="modal-head">
              <h2 id="reading-title">{svg(ACTIVITY, 20)}{labels.details}</h2>
              <button className="btn icon" type="button" onClick={() => setOpen(null)} aria-label={labels.close} autoFocus>{svg(X)}</button>
            </div>
            <div className="modal-body">
              <span>{labels.date}</span><b className="num">{open.date}</b>
              <span>{labels.reading}</span><b className="num">{open.value} m³</b>
              <span>{labels.usage}</span><b className="num">{open.used} {open.used === "—" ? "" : "m³"}</b>
              <span>{labels.signal}</span><span>{open.signal === "—" ? "—" : <span className="chip c-ok">{svg(ACTIVITY, 13)}{open.signal}</span>}</span>
              <span>{labels.battery}</span><b className="num">{open.battery}{open.battery === "—" ? "" : " V"}</b>
              <span>{labels.meter_serial}</span><b className="mono">{labels.meterSerial || "—"}</b>
              <span>{labels.modem_serial}</span><b className="mono">{labels.modemSerial}</b>
              <span>{labels.received}</span><b className="num">{open.received}</b>
              {showForward && <><span>{labels.forwarded}</span><span><span className={`chip ${open.forwardCls}`}>{open.forward}</span>
                {open.forwardError && <span className="sub mono" style={{ marginTop: 6 }}>{open.forwardError}</span>}</span></>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
