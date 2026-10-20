import { getSetting } from "./db";

export async function sendTelegram(text, override) {
  const cfg = override || (await getSetting("telegram", {}));
  if (!override && !cfg.enabled) return false;
  if (!cfg.botToken || !cfg.chatId) return false;
  const res = await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: cfg.chatId, text, disable_web_page_preview: true })
  });
  return res.ok;
}
