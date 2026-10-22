import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import Flash from "@/components/Flash";
import CustomerForm from "@/components/CustomerForm";

export default async function NewCustomerPage({ searchParams }) {
  await requireUser();
  const t = getT();
  return (
    <>
      <div className="head"><div>
        <div className="crumbs"><Link href="/customers">{t("customers_title")}</Link>›<span>{t("new_customer")}</span></div>
        <h1>{t("new_customer")}</h1></div></div>
      <Flash searchParams={searchParams} />
      <CustomerForm />
    </>
  );
}
