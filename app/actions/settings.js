"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db, normalizePhone, getSetting, setSetting } from "@/lib/db";
import { requireUser, clientIp, PASSWORD_RULE } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { sendTelegram } from "@/lib/telegram";

export async function saveProfile(formData) {
  const user = await requireUser();
  const fullName = String(formData.get("full_name") || "").trim();
  const phone = normalizePhone(formData.get("phone"));
  const password = String(formData.get("password") || "");
  if (!fullName || !phone) redirect("/settings?err=required");
  if (password && !PASSWORD_RULE.test(password)) redirect("/settings?err=password_rule");
  if (password !== String(formData.get("password2") || "")) redirect("/settings?err=password_mismatch");
  const sql = await db();
  const [clash] = await sql`SELECT id FROM users WHERE phone = ${phone} AND id <> ${user.id}`;
  if (clash) redirect("/settings?err=phone_taken");
  const data = {
    full_name: fullName, phone,
    client_type: formData.get("client_type") === "legal" ? "legal" : "individual",
    pinfl: String(formData.get("pinfl") || "").trim() || null,
    ...(password && { password_hash: await bcrypt.hash(password, 12) })
  };
  await sql`UPDATE users SET ${sql(data)} WHERE id = ${user.id}`;
  await audit(user, "update", "user", user.id, { profile: true, password_changed: !!password }, clientIp());
  redirect("/settings?msg=saved");
}

export async function saveTelegram(formData) {
  const user = await requireUser("admin");
  const current = await getSetting("telegram", {});
  const botToken = String(formData.get("botToken") || "").trim();
  const cfg = {
    enabled: formData.get("enabled") === "on",
    chatId: String(formData.get("chatId") || "").trim(),
    // An empty field keeps the saved token, so it never has to be shown again.
    botToken: botToken || current.botToken || ""
  };
  await setSetting("telegram", cfg);
  await audit(user, "update", "settings", "telegram", { enabled: cfg.enabled, chatId: cfg.chatId }, clientIp());
  if (formData.get("test") === "1") {
    const ok = await sendTelegram("✅ UZLITR: test xabari / тестовое сообщение / test message", cfg).catch(() => false);
    redirect(`/settings?${ok ? "msg=test_sent" : "err=test_failed"}`);
  }
  redirect("/settings?msg=saved");
}
