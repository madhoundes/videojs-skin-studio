/* <reskin-player>: one tag, the whole skin. */
const RS_DEFAULT_THEME = "r1.glass.ff7a59.13a3a0.0b2230.ffffff.f1f6f6.13191b.d.ph.r.14_5.18.4.n.w.01011000";
const rsLoaded = new Set();
function rsOnce(id, make) { if (rsLoaded.has(id) || document.getElementById(id)) return; rsLoaded.add(id); document.head.appendChild(make()); }
function rsHash(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i); return (h >>> 0).toString(36); }
let rsUid = 0;
// Each theme's CSS is scoped to the players that use it, so many skins can share one page.
// Keyframes are renamed per theme and kept outside the scope block.
function rsScope(css, id) {
  if (typeof CSSScopeRule === "undefined") return css + "\nreskin-player { display: block; }";
  const renamed = css.replace(/\brs-(spin|blink|breathe)\b/g, `rs-$1-${id}`);
  const frames = [];
  const body = renamed.replace(/@keyframes\s+[\w-]+\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, m => { frames.push(m); return ""; });
  return `reskin-player { display: block; }\n${frames.join("\n")}\n@scope (reskin-player[data-rs-skin="${id}"]) {\n${body}\n}`;
}

class ReskinPlayer extends HTMLElement {
  static get observedAttributes() { return ["theme", "src", "playback-id", "poster", "logo", "symbol", "captions", "chapters", "thumbnails", "crossorigin"]; }
  connectedCallback() { this._ready = true; this.render(); }
  // several attributes set in a row cause one render, not one each
  attributeChangedCallback() {
    if (!this._ready || this._queued) return;
    this._queued = true;
    queueMicrotask(() => { this._queued = false; this.render(); });
  }
  render() {
    const t = rsDecode(this.getAttribute("theme")) || rsDecode(RS_DEFAULT_THEME);
    const logo = this.getAttribute("logo") || "";
    const symbol = this.getAttribute("symbol") || null;
    const caps = (this.getAttribute("captions") || "").split(",").map(x => x.trim()).filter(Boolean).map(x => {
      const [url, lang, label] = x.split("|").map(v => (v || "").trim());
      return [url, lang || "en", label || lang || "Captions"];
    });
    const ch = this.getAttribute("chapters") || "";
    const thumbs = this.getAttribute("thumbnails") || "";
    const s = Object.assign({}, t, {
      logo, symbol: t.hasSymbol ? symbol : null,
      showLogo: t.showLogo && !!logo,
      direction: logo ? t.direction : (t.direction === "signature" ? "signature" : "none"),
      chapters: t.chapters && !!ch,
      transcript: t.transcript && caps.length > 0 && !rsEmbedOf(this.getAttribute("src"))
    });
    const raw = buildCSS(s, false);
    const id = "rs-style-" + rsHash(raw);
    this.setAttribute("data-rs-skin", id);
    rsOnce(id, () => { const st = document.createElement("style"); st.id = id; st.textContent = rsScope(raw, id); return st; });
    const f = FONTS[s.font];
    rsOnce("rs-font-" + s.font, () => { const l = document.createElement("link"); l.id = "rs-font-" + s.font; l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?family=" + f.g + "&display=swap"; return l; });
    const uid = ++rsUid;
    // reskin-lite.js has no Mux support: a playback-id falls back to the HLS stream, which browsers with built-in HLS can play
    let pid = (this.getAttribute("playback-id") || "").replace(/[^A-Za-z0-9]/g, "");
    let src = this.getAttribute("src") || "";
    if (pid && window.RESKIN_LITE) {
      console.warn("Reskin: playback-id needs reskin.js (reskin-lite.js has no Mux support). Falling back to the HLS stream.");
      src = src || `https://stream.mux.com/${pid}.m3u8`;
      pid = "";
    }
    const emb = rsEmbedOf(src);
    if (emb && window.RESKIN_LITE) console.warn(`Reskin: ${emb.name} links need reskin.js (reskin-lite.js plays plain video files only).`);
    const html = buildMarkup(s, {
      src, poster: this.getAttribute("poster") || "",
      playbackId: pid,
      cors: this.hasAttribute("crossorigin"),
      thumbs, caps, ch, logo
    }).replace(/(id|commandfor)="(rs-settings|rs-menu-speed|rs-menu-subs)"/g, (m, a, v) => `${a}="${v}-${uid}"`);
    this.innerHTML = html;
    reskinTranscript(this.querySelector(".rs-layout"));
    reskinBackfill(this);
    reskinTrimLogo(this);
  }
}
if (!customElements.get("reskin-player")) customElements.define("reskin-player", ReskinPlayer);
window.Reskin = { encode: rsEncode, decode: rsDecode, buildCSS, buildMarkup };
