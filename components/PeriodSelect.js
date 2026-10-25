"use client";
import { useRouter } from "next/navigation";

// "So'ngi 7 kun ⌄" dropdown; each option carries the link it opens.
export default function PeriodSelect({ options, value, label }) {
  const router = useRouter();
  return (
    <select className="f period-select" value={value} aria-label={label}
      onChange={(e) => router.push(options.find((o) => String(o.value) === e.target.value).href, { scroll: false })}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
