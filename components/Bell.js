import Link from "next/link";
import { getT } from "@/lib/i18n";
import { fmtAgo } from "@/lib/format";
import { getLang } from "@/lib/i18n";
import Icon from "./Icon";

const COLOR = { bad: "var(--bad)", warn: "var(--warn)" };

// Notification bell; a native <details> dropdown, so it needs no client script.
export default function Bell({ alerts, hrefFor }) {
  const t = getT(), lang = getLang();
  const text = (a) => ({
    offline: [t("al_offline"), t("al_offline_d", { ago: fmtAgo(a.at, lang) })],
    battery: [t("al_battery"), t("al_battery_d", { v: a.value?.toFixed(2) })],
    leak: [t("al_leak"), t("al_leak_d", { v: a.value?.toFixed(3) })],
    forward: [t("al_forward"), t("al_forward_d", { n: a.value })],
    application: [t("al_application"), t("al_application_d", { n: a.value })]
  }[a.type]);
  return (
    <details className="menu">
      <summary className="bell" aria-label={t("notifications")}>
        <Icon name="bell" />{alerts.length > 0 && <span className="count">{alerts.length > 99 ? "99+" : alerts.length}</span>}
      </summary>
      <div className="menu-pop" style={{ maxHeight: 420, overflowY: "auto" }}>
        <div className="menu-head"><b>{t("notifications")}</b><small>{alerts.length ? t("n_alerts", { n: alerts.length }) : t("no_alerts")}</small></div>
        {alerts.map((a, i) => {
          const [title, desc] = text(a);
          const body = (<><span className="dot" style={{ background: COLOR[a.severity] }} />
            <div><b>{title}{a.label && <span className="mono" style={{ fontWeight: 500 }}> · {a.label}</span>}</b><span>{desc}</span></div></>);
          const href = hrefFor(a);
          return href ? <Link key={i} href={href} className="alert-item">{body}</Link> : <div key={i} className="alert-item">{body}</div>;
        })}
      </div>
    </details>
  );
}
