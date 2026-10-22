import { LANGS, getLang } from "@/lib/i18n";
import { setLanguage } from "@/app/actions/auth";
import Icon from "./Icon";

const FLAGS = { uz: "🇺🇿", ru: "🇷🇺", en: "🇬🇧" };

// Language picker styled like the rest of the UI (a native <select> list can't be styled).
export default function LangSwitch({ align = "left" }) {
  const lang = getLang();
  const current = LANGS.find((l) => l.code === lang);
  return (
    <details className="menu lang-menu">
      <summary className="lang" aria-label="Til / Язык / Language">
        <Icon name="globe" size={16} /><span className="lang-short">{current.short}</span>
        <span className="lang-name">{current.label}</span><Icon name="chevronDown" size={15} />
      </summary>
      <form action={setLanguage} className="menu-pop lang-pop" style={align === "center" ? { left: "50%", right: "auto", transform: "translateX(-50%)" } : align === "right" ? undefined : { left: 0, right: "auto" }}>
        {LANGS.map((l) => (
          <button key={l.code} type="submit" name="lang" value={l.code} className="lang-opt" aria-current={l.code === lang ? "true" : undefined}>
            <span className="flag" aria-hidden="true">{FLAGS[l.code]}</span>
            <span><b>{l.label}</b><small>{l.short}</small></span>
            {l.code === lang && <Icon name="check" size={16} />}
          </button>
        ))}
      </form>
    </details>
  );
}
