"use server";
import { redirect } from "next/navigation";
import { requireUser, clientIp } from "@/lib/auth";
import { forwardPending } from "@/lib/vodokanal";
import { audit } from "@/lib/audit";

export async function forwardNow() {
  const user = await requireUser("admin");
  const r = await forwardPending({ limit: 500 });
  await audit(user, "forward", "readings", null, { sent: r.sent, failed: r.failed }, clientIp());
  if (r.failed) redirect(`/?err=forward_failed_n&n=${r.failed}`);
  redirect(`/?msg=forwarded_n&n=${r.sent}`);
}
