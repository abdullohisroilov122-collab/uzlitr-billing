import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import Icon from "@/components/Icon";
import AddMeterForm from "./AddMeterForm";

export default async function AddMeterPage() {
  await requireClient();
  const t = getT();
  const keys = ["modem", "modem_hint", "sending", "error", "modem_not_found", "modem_taken", "modem_pending", "modem_invalid", "modem_rate", "rate"];
  const L = { ...Object.fromEntries(keys.map((k) => [k, t(`reg_${k}`)])), submit: t("send_application"),
    done_title: t("addm_done_title"), done_text: t("addm_done_text"), to_home: t("back_to_cabinet") };
  return (
    <section className="card" style={{ maxWidth: 620 }}>
      <Link className="link" href="/portal"><Icon name="arrowLeft" />{t("back_to_cabinet")}</Link>
      <h2><span className="ico c-acc"><Icon name="plus" /></span>{t("add_new_meter")}</h2>
      <p>{t("addm_intro")}</p>
      <AddMeterForm L={L} />
    </section>
  );
}
