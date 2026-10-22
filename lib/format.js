import { LOCALES } from "./i18n";

export function fmtDate(value, lang, withTime = true, withSeconds = false) {
  if (!value) return "—";
  // Day.month.year everywhere, as people write it in Uzbekistan, whatever the UI language.
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tashkent", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date(value)).map((x) => [x.type, x.value]));
  const date = `${p.day}.${p.month}.${p.year}`;
  if (!withTime) return date;
  return `${date} ${p.hour}:${p.minute}${withSeconds ? `:${p.second}` : ""}`;
}

export function fmtAgo(value, lang) {
  if (!value) return "—";
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  const rtf = new Intl.RelativeTimeFormat(LOCALES[lang] || "uz-UZ", { numeric: "auto" });
  if (Math.abs(minutes) < 60) return rtf.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(-hours, "hour");
  return rtf.format(-Math.round(hours / 24), "day");
}

export function fmtM3(value) {
  if (value === null || value === undefined) return "—";
  return `${Number(value).toLocaleString("en-US", { maximumFractionDigits: 3 }).replace(/,/g, " ")} m³`;
}
