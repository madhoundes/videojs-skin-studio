// Shared helper for the Mux API. Keys come from Vercel environment variables, never from the browser.
export function muxAuth() {
  const id = process.env.MUX_TOKEN_ID;
  const secret = process.env.MUX_TOKEN_SECRET;
  if (!id || !secret) return null;
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

export async function mux(path, auth, init = {}) {
  const r = await fetch("https://api.mux.com" + path, {
    ...init,
    headers: { Authorization: auth, "Content-Type": "application/json", ...(init.headers || {}) }
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (j.error && (j.error.messages || []).join(" ")) || `Mux answered ${r.status}`;
    throw Object.assign(new Error(msg), { status: r.status });
  }
  return j.data;
}

export const LANGS = { en: "English", es: "Español", fr: "Français", de: "Deutsch", it: "Italiano", pt: "Português", tr: "Türkçe", nl: "Nederlands", auto: "Captions" };

export const MISSING_KEYS = "Uploads are off: add your two Mux keys (token ID and token secret) in your Vercel project settings, then redeploy.";
