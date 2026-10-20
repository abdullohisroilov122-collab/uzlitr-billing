import { LANGS, getLang } from "@/lib/i18n";
import { setLanguage } from "@/app/actions/auth";
import { AutoSubmitSelect } from "./client";

export default function LangSwitch() {
  const lang = getLang();
  return (
    <form action={setLanguage}>
      <AutoSubmitSelect name="lang" defaultValue={lang} className="lang" aria-label="Til / Язык / Language">
        {LANGS.map((l) => <option key={l.code} value={l.code}>{l.short} · {l.label}</option>)}
      </AutoSubmitSelect>
    </form>
  );
}
