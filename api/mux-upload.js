// POST /api/mux-upload  { lang }  ->  { id, url }
// Creates a one-time Mux direct upload. The browser then sends the file straight to Mux.
import { muxAuth, mux, LANGS, MISSING_KEYS } from "./_mux.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
  const auth = muxAuth();
  if (!auth) return res.status(500).json({ error: MISSING_KEYS });
  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const lang = LANGS[body.lang] ? body.lang : "en";
  try {
    const data = await mux("/video/v1/uploads", auth, {
      method: "POST",
      body: JSON.stringify({
        cors_origin: req.headers.origin || "*",
        new_asset_settings: {
          playback_policies: ["public"],
          video_quality: "basic",
          max_resolution_tier: "1080p",
          inputs: [{ generated_subtitles: [{ language_code: lang, name: `${LANGS[lang]} (auto)` }] }]
        }
      })
    });
    res.status(200).json({ id: data.id, url: data.url });
  } catch (e) {
    res.status(502).json({ error: e.message || "Mux refused the upload." });
  }
}
