"use client";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { usePathname } from "next/navigation";
import Link from "next/link";

export function SubmitButton({ children, className = "btn primary", ...rest }) {
  const { pending } = useFormStatus();
  return <button type="submit" className={className} disabled={pending} {...rest}>{children}</button>;
}

// Two-step delete: the first click asks, the second one submits the surrounding form.
export function ConfirmSubmit({ label, question, confirmLabel, cancelLabel }) {
  const [asking, setAsking] = useState(false);
  if (!asking) return <button type="button" className="btn danger sm" onClick={() => setAsking(true)}>{label}</button>;
  return (
    <span className="actions" style={{ color: "var(--bad)", fontSize: 13 }}>
      {question}
      <SubmitButton className="btn danger sm">{confirmLabel}</SubmitButton>
      <button type="button" className="btn sm" onClick={() => setAsking(false)}>{cancelLabel}</button>
    </span>
  );
}

export function CopyButton({ text, label, doneLabel }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn sm" onClick={async () => {
      try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); } catch {}
    }}>{done ? doneLabel : label}</button>
  );
}

export function AutoSubmitSelect(props) {
  return <select {...props} onChange={(e) => e.target.form.requestSubmit()} />;
}

export function NavLinks({ items }) {
  const path = usePathname();
  return items.map((item) => {
    const current = item.href === "/" ? path === "/" : path.startsWith(item.href);
    return (
      <Link key={item.href} href={item.href} aria-current={current ? "page" : undefined}>
        <span dangerouslySetInnerHTML={{ __html: item.icon }} style={{ display: "contents" }} />
        <span>{item.label}</span>
      </Link>
    );
  });
}
