import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser, hasRole } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import Icon from "@/components/Icon";
import Flash from "@/components/Flash";
import { SubmitButton, ConfirmSubmit } from "@/components/client";
import { saveModel, deleteModel } from "@/app/actions/models";

export default async function ModelsPage({ searchParams }) {
  const user = await requireUser();
  const t = getT();
  const admin = hasRole(user, "admin");
  const sql = await db();
  const q = (searchParams.q || "").trim();
  const models = await sql`
    SELECT md.*, (SELECT count(*)::int FROM meters m WHERE m.model_id = md.id) AS meters
    FROM models md ${q ? sql`WHERE md.name ILIKE ${"%" + q + "%"} OR md.manufacturer ILIKE ${"%" + q + "%"}` : sql``}
    ORDER BY md.name`;
  const editing = !admin ? null : searchParams.edit === "new" ? {} : models.find((m) => String(m.id) === searchParams.edit);

  return (
    <>
      <div className="head">
        <div><h1>{t("models_title")}</h1><p>{t("models_title")}: {models.length}</p></div>
        {admin && <div className="actions"><Link className="btn primary" href="/models?edit=new"><Icon name="plus" />{t("add")}</Link></div>}
      </div>
      <Flash searchParams={searchParams} />

      {editing && (
        <form action={saveModel} className="card">
          <h2><Icon name="chip" />{editing.id ? t("edit_model") : t("new_model")}</h2>
          <input type="hidden" name="id" value={editing.id ?? ""} />
          <div className="form">
            <label>{t("name")} *<input className="f" name="name" defaultValue={editing.name ?? ""} placeholder="UZMM 15" required /></label>
            <label>{t("manufacturer")}<input className="f" name="manufacturer" defaultValue={editing.manufacturer ?? ""} /></label>
            <label>{t("diameter")} (mm)<input className="f" name="diameter_mm" type="number" min="1" defaultValue={editing.diameter_mm ?? ""} /></label>
            <label>{t("ping_interval")} ({t("hours")})<input className="f" name="ping_hours" type="number" min="1" defaultValue={editing.ping_hours ?? 24} /></label>
            <label className="full">{t("description")}<textarea className="f" name="description" defaultValue={editing.description ?? ""} /></label>
          </div>
          <div className="form-foot"><Link className="btn" href="/models">{t("cancel")}</Link><SubmitButton><Icon name="check" />{t("save")}</SubmitButton></div>
        </form>
      )}

      <form className="toolbar" method="get">
        <label className="search"><Icon name="search" /><input name="q" defaultValue={q} placeholder={t("search")} aria-label={t("search")} /></label>
      </form>
      {models.length ? (
        <div className="cards">{models.map((m) => (
          <article className="mcard" key={m.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <div className="kpi" style={{ padding: 0, border: 0, background: "none" }}><div className="ico c-acc"><Icon name="chip" /></div></div>
                <div><h3>{m.name}</h3><span className="sub" style={{ textTransform: "uppercase", letterSpacing: ".04em" }}>{m.manufacturer || "—"}</span></div>
              </div>
              {admin && <Link className="btn sm" href={`/models?edit=${m.id}`} aria-label={t("edit")}><Icon name="edit" /></Link>}
            </div>
            {m.description && <p style={{ margin: 0 }}>{m.description}</p>}
            <div className="meta">
              <span>{t("diameter")}: <b>{m.diameter_mm ? `${m.diameter_mm} mm` : "—"}</b></span>
              <span>{t("ping_interval")}: <b>{m.ping_hours} {t("hours")}</b></span>
              <span>{t("meters_count")}: <b>{m.meters}</b></span>
            </div>
            {admin && !m.meters && (
              <form action={deleteModel}><input type="hidden" name="id" value={m.id} />
                <ConfirmSubmit label={t("delete")} question={t("confirm_delete")} confirmLabel={t("yes_delete")} cancelLabel={t("cancel")} /></form>
            )}
          </article>))}
        </div>
      ) : <div className="card"><div className="empty">{t("empty")}</div></div>}
    </>
  );
}
