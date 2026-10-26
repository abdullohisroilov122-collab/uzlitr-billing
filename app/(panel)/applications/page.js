import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser, hasRole } from "@/lib/auth";
import { getT, getLang } from "@/lib/i18n";
import { fmtDate } from "@/lib/format";
import Icon from "@/components/Icon";
import Flash from "@/components/Flash";
import { SubmitButton, ConfirmSubmit } from "@/components/client";
import { approveApplication, rejectApplication } from "@/app/actions/applications";

const STATUS_CLS = { pending: "c-warn", approved: "c-ok", rejected: "c-bad" };

export default async function ApplicationsPage({ searchParams }) {
  const user = await requireUser();
  const t = getT(), lang = getLang();
  const status = ["pending", "approved", "rejected"].includes(searchParams.status) ? searchParams.status : "pending";
  const sql = await db();
  const [counts] = await sql`
    SELECT count(*) FILTER (WHERE status = 'pending')::int AS pending, count(*) FILTER (WHERE status = 'approved')::int AS approved,
           count(*) FILTER (WHERE status = 'rejected')::int AS rejected FROM applications`;
  const apps = await sql`
    SELECT a.*, c.name AS customer_name, u.full_name AS reviewer, m.meter_serial
    FROM applications a LEFT JOIN customers c ON c.id = a.customer_id LEFT JOIN users u ON u.id = a.reviewed_by
    LEFT JOIN meters m ON m.id = a.meter_id
    WHERE a.status = ${status} ORDER BY a.created_at DESC LIMIT 200`;
  const admin = hasRole(user, "admin");

  return (
    <>
      <div className="head"><div><h1>{t("apps_title")}</h1><p>{t("apps_sub")}</p></div></div>
      <Flash searchParams={searchParams} />
      <nav className="tabs">
        {["pending", "approved", "rejected"].map((s) => (
          <Link key={s} href={`/applications?status=${s}`} aria-current={status === s ? "page" : undefined}>{t(`app_${s}`)} · {counts[s]}</Link>
        ))}
      </nav>
      {apps.length ? (
        <div className="cards">{apps.map((a) => {
          const d = a.data || {};
          const rows = a.kind === "register"
            ? [[t("client_type"), t(d.kind === "legal" ? "ct_legal" : "ct_individual")], [t("name"), d.name], [t("phone"), d.phone],
               [d.kind === "legal" ? t("inn") : t("pinfl"), d.kind === "legal" ? d.inn : d.pinfl],
               [t("address"), [d.region, d.district, d.street, d.house].filter(Boolean).join(", ")], [t("cadastr_number"), d.cadastr_number]]
            : [[t("customer"), a.customer_name]];
          return (
            <article className="mcard" key={a.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                <div><h3>{a.kind === "register" ? t("app_kind_register") : t("app_kind_add_meter")} <span className="muted">#{a.id}</span></h3>
                  <span className="sub">{fmtDate(a.created_at, lang)}</span></div>
                <span className={`chip ${STATUS_CLS[a.status]}`}>{t(`app_${a.status}`)}</span>
              </div>
              <div className="info compact-info">
                <div><Icon name="wifi" /><span>{t("modem_serial")}</span><b className="mono">{a.modem_serial}</b></div>
                {a.meter_serial && <div><Icon name="gauge" /><span>{t("meter_serial")}</span><b className="mono">{a.meter_serial}</b></div>}
                {rows.map(([k, v]) => <div key={k}><Icon name="doc" /><span>{k}</span><b>{v || "—"}</b></div>)}
              </div>
              {a.note && <p className="muted">💬 {a.note}</p>}
              {a.reviewer && <span className="sub">{t("reviewed_by")}: {a.reviewer} · {fmtDate(a.reviewed_at, lang)}</span>}
              {a.status === "pending" && admin && (
                <div className="actions">
                  <form action={approveApplication}><input type="hidden" name="id" value={a.id} />
                    <SubmitButton className="btn primary sm"><Icon name="check" />{t("approve")}</SubmitButton></form>
                  <form action={rejectApplication} className="actions"><input type="hidden" name="id" value={a.id} />
                    <input className="f" name="note" placeholder={t("reject_reason")} style={{ width: 170, padding: "6px 10px" }} />
                    <ConfirmSubmit label={t("reject")} question={t("confirm_reject")} confirmLabel={t("reject")} cancelLabel={t("cancel")} /></form>
                </div>
              )}
            </article>
          );
        })}</div>
      ) : <div className="card"><div className="empty"><b>{t("apps_empty")}</b></div></div>}
    </>
  );
}
