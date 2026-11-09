// GET /api/mux-status?upload=ID  ->  { status, playbackId, aspect, captions }
// Follows an upload until its asset is ready, then reports the playback ID and the generated captions track.
import { muxAuth, mux, MISSING_KEYS } from "./_mux.js";

export default async function handler(req, res) {
  const auth = muxAuth();
  if (!auth) return res.status(500).json({ error: MISSING_KEYS });
  const id = String((req.query && req.query.upload) || "");
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(id)) return res.status(400).json({ error: "Missing upload id." });
  res.setHeader("Cache-Control", "no-store");
  try {
    const up = await mux(`/video/v1/uploads/${id}`, auth);
    if (!up.asset_id) {
      const failed = up.status === "errored" || up.status === "cancelled" || up.status === "timed_out";
      return res.status(200).json({ status: failed ? "errored" : "waiting" });
    }
    const asset = await mux(`/video/v1/assets/${up.asset_id}`, auth);
    const pid = (asset.playback_ids || []).find(p => p.policy === "public");
    const track = (asset.tracks || []).find(t => t.type === "text" && t.text_source === "generated_vod");
    res.status(200).json({
      status: asset.status,
      playbackId: pid ? pid.id : null,
      aspect: asset.aspect_ratio || null,
      captions: track && pid ? {
        status: track.status,
        lang: track.language_code || "en",
        name: track.name || "Captions",
        url: `https://stream.mux.com/${pid.id}/text/${track.id}.vtt`
      } : null
    });
  } catch (e) {
    res.status(e.status === 404 ? 404 : 502).json({ error: e.message || "Could not reach Mux." });
  }
}
