// Server-side proxy for the "Send Us Your Wishes" form.
//
// The whole point of this file is that the Telegram bot token is read from
// the environment *here*, on Netlify's servers, and never reaches the
// browser. The variables are deliberately NOT prefixed with VITE_ — that
// prefix is what tells Vite to inline a value into the public JS bundle,
// which is exactly how the token was exposed before.
//
// Uses the .mjs extension because package.json has no "type": "module",
// so a plain .js file here would be treated as CommonJS.

const TELEGRAM_API = "https://api.telegram.org";

const NAME_MAX = 80;
const MESSAGE_MAX = 600;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Requests are only accepted from this site's own pages. On its own this is
// not a security boundary — an Origin header is trivially forged by anything
// that isn't a browser — but it costs nothing and stops the endpoint from
// being casually embedded in someone else's page.
//
// This compares the Origin against the host the request actually arrived on,
// rather than an allowlist built from Netlify's env vars. Netlify serves the
// same deploy under several hostnames — the production URL, per-deploy
// permalinks like <hash>--<site>.netlify.app, branch and preview deploys, and
// any custom domain — and an allowlist missed all but the first, so the form
// 403'd everywhere except production. Matching Origin to Host covers every
// one of those automatically, including localhost under `netlify dev`.
function isAllowedOrigin(req) {
  const origin = req.headers.get("origin");

  // Same-origin requests are allowed to omit Origin entirely.
  if (!origin) return true;

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export default async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!isAllowedOrigin(req)) {
    return json({ error: "Forbidden" }, 403);
  }

  const token = process.env.WISHES_BOT_TOKEN;
  const chatId = process.env.WISHES_CHAT_ID;
  if (!token || !chatId) {
    console.error("WISHES_BOT_TOKEN / WISHES_CHAT_ID are not set on this deploy");
    return json({ error: "The wishes form is not configured" }, 500);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const name = String(body?.name ?? "").trim().slice(0, NAME_MAX);
  const message = String(body?.message ?? "").trim().slice(0, MESSAGE_MAX);
  if (!name || !message) {
    return json({ error: "Name and message are required" }, 400);
  }

  // No parse_mode is set, so Telegram renders this as plain text and
  // nothing a guest types can be interpreted as markup.
  const text = `💌 New wish for Arun & Aswathy\nFrom: ${name}\n\n${message}`;

  let telegramRes;
  try {
    telegramRes = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (err) {
    console.error("Could not reach Telegram:", err);
    return json({ error: "Could not deliver the wish" }, 502);
  }

  if (!telegramRes.ok) {
    // Logged server-side only: Telegram's error body names the bot and chat,
    // which guests have no reason to see.
    console.error("Telegram rejected the message:", telegramRes.status, await telegramRes.text());
    return json({ error: "Could not deliver the wish" }, 502);
  }

  return json({ ok: true });
};
