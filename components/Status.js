import { getT } from "@/lib/i18n";

const CLS = { active: "c-ok", offline: "c-bad", never: "c-mut" };
const KEY = { active: "st_active", offline: "st_offline", never: "st_never" };

export default function Status({ value }) {
  const t = getT();
  return <span className={`chip dot ${CLS[value] || "c-mut"}`}>{t(KEY[value] || value)}</span>;
}
