import { getT } from "@/lib/i18n";

// Shows ?msg=<key> or ?err=<key> after a form redirect.
export default function Flash({ searchParams }) {
  const t = getT();
  if (searchParams?.err) return <div className="banner bad" role="alert">{t(searchParams.err)}</div>;
  if (searchParams?.msg) return <div className="banner ok" role="status">{t(searchParams.msg, searchParams)}</div>;
  return null;
}
