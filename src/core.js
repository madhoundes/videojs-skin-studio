/* Reskin core: the skin builder shared by the studio and <reskin-player>. Generated from studio.html by tools/extract-core.mjs. */
// A wordmark often comes with empty space around it (a loose SVG viewBox, a padded PNG).
// Trim it to the ink so the play capsule hugs the logo. Falls back to the original file.
var rsTrimCache = {};
function reskinTrimLogo(root) {
  if (root) root.querySelectorAll(".rs-big-logo, .rs-logo").forEach(rsTrimOne);
}
function rsTrimOne(img) {
  var src = img.getAttribute("src");
  if (!src) return;
  var apply = function (u) { if (u && u !== src && img.getAttribute("src") === src) img.setAttribute("src", u); };
  var hit = rsTrimCache[src];
  if (typeof hit === "string") return apply(hit);
  if (!hit) {
    hit = rsTrimCache[src] = new Promise(function (done) {
      var im = new Image();
      if (!/^data:/.test(src)) im.crossOrigin = "anonymous";
      im.onerror = function () { done(src); };
      im.onload = function () {
        try {
          var sc = Math.min(4, 1400 / Math.max(im.naturalWidth || 300, 1));
          var W = Math.max(1, Math.round((im.naturalWidth || 300) * sc)), H = Math.max(1, Math.round((im.naturalHeight || 150) * sc));
          var c = document.createElement("canvas"); c.width = W; c.height = H;
          var x = c.getContext("2d", { willReadFrequently: true });
          x.drawImage(im, 0, 0, W, H);
          var d = x.getImageData(0, 0, W, H).data, clear = 0, i, X, Y;
          for (i = 3; i < d.length; i += 16) if (d[i] < 24) clear++;
          var alpha = clear > d.length / 16 * .04, bg = [d[0], d[1], d[2]];
          var x0 = W, y0 = H, x1 = -1, y1 = -1;
          for (Y = 0; Y < H; Y++) for (X = 0; X < W; X++) {
            i = (Y * W + X) * 4;
            var on = alpha ? d[i + 3] > 24 : Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 60;
            if (on) { if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y; }
          }
          if (x1 < 0 || (x1 - x0 > W * .97 && y1 - y0 > H * .97)) return done(src);
          var pad = Math.round((y1 - y0) * .06), o = document.createElement("canvas");
          x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
          o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
          o.getContext("2d").drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
          done(o.toDataURL("image/png"));
        } catch (e) { done(src); }
      };
      im.src = src;
    });
  }
  hit.then(function (u) { rsTrimCache[src] = u; apply(u); });
}

// YouTube and Vimeo links play through Video.js's own <youtube-video> and <vimeo-video>, inside the same skin
function rsEmbedOf(src) {
  var u = String(src || "");
  var yt = u.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (yt) return { tag: "youtube-video", name: "YouTube", id: yt[1] };
  var vm = u.match(/vimeo\.com\/(?:video\/|channels\/[^/]+\/|groups\/[^/]+\/videos\/)?(\d{6,})/);
  if (vm) return { tag: "vimeo-video", name: "Vimeo", id: vm[1] };
  return null;
}
function rsMediaOf(root) {
  return root.querySelector("youtube-video, vimeo-video") || root.querySelector("video");
}

function reskinBackfill(root) {
  (root || document).querySelectorAll(".rs-player").forEach(function (pl) {
    var v = pl.querySelector("video"), c = pl.querySelector(".rs-backfill");
    if (!v || !c) return;
    var x = c.getContext("2d"), raf = 0;
    var poster = null;
    // before playback the poster paints the fill (a first frame is often black), after that the video does
    var draw = function () { try { if (poster && v.paused && v.currentTime < .05) x.drawImage(poster, 0, 0, c.width, c.height); else if (v.readyState >= 2) x.drawImage(v, 0, 0, c.width, c.height); } catch (e) {} };
    var loop = function () { draw(); raf = v.paused || v.ended ? 0 : requestAnimationFrame(loop); };
    v.addEventListener("play", function () { if (!raf) raf = requestAnimationFrame(loop); });
    ["loadeddata", "seeked", "pause"].forEach(function (e) { v.addEventListener(e, draw); });
    if (v.poster) { var im = new Image(); im.onload = function () { poster = im; draw(); }; im.src = v.poster; }
  });
}

function reskinTranscript(root) {
  if (!root) return;
  var video = root.querySelector("video");
  var panel = root.querySelector(".rs-transcript");
  if (!video || !panel) return;
  var list = panel.querySelector(".rs-tx-list");
  var tabs = panel.querySelectorAll("[data-rs-tab]");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var sec = function (s) { return s.split(":").reduce(function (a, v) { return a * 60 + parseFloat(v); }, 0); };
  var parse = function (txt) {
    return txt.replace(/\r/g, "").split(/\n\n+/).map(function (b) {
      var lines = b.split("\n");
      var i = lines.findIndex(function (l) { return l.indexOf("-->") > -1; });
      if (i < 0) return null;
      var parts = lines[i].split("-->");
      var text = lines.slice(i + 1).join(" ");
      var m = text.match(/^<v\s+([^>]+)>/);
      return { start: sec(parts[0].trim()), end: sec(parts[1].trim().split(/\s+/)[0]), who: m ? m[1] : "", text: text.replace(/<[^>]+>/g, "") };
    }).filter(Boolean);
  };
  var fmt = function (s) { return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0"); };
  var fetchCues = function (src) {
    if (!src) return Promise.resolve([]);
    return fetch(src).then(function (r) { return r.text(); }).then(parse).catch(function () { return []; });
  };
  var capSrc = function () {
    var els = Array.prototype.slice.call(video.querySelectorAll('track[kind="captions"], track[kind="subtitles"]'));
    var on = els.filter(function (t) { return t.track && t.track.mode === "showing"; })[0];
    var own = video.closest("mux-video");
    return (on || els[0] || {}).src || (own && own.getAttribute("data-rs-cap")) || "";
  };
  var load = function (kind) {
    if (kind === "captions") return fetchCues(capSrc());
    var tr = video.querySelector('track[kind="' + kind + '"]');
    return fetchCues(tr && tr.src);
  };
  var data = { captions: [], chapters: [] }, mode = "captions", rows = [], cur = -1;
  function sync(force) {
    var t = video.currentTime, idx = -1;
    rows.forEach(function (r, i) { if (t >= r.c.start - 0.05) idx = i; });
    if (idx === cur && !force) return;
    cur = idx;
    rows.forEach(function (r, i) { r.li.toggleAttribute("data-active", i === idx); });
    if (idx >= 0) list.scrollTo({ top: rows[idx].li.offsetTop - list.clientHeight / 3, behavior: reduce ? "auto" : "smooth" });
  }
  function render() {
    list.innerHTML = "";
    cur = -1;
    rows = (data[mode] || []).map(function (c) {
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "rs-tx-line";
      var time = document.createElement("span");
      time.className = "rs-tx-time";
      time.textContent = fmt(c.start);
      var tx = document.createElement("span");
      tx.className = "rs-tx-text";
      if (c.who) { var w = document.createElement("strong"); w.textContent = c.who; tx.append(w, " "); }
      tx.append(c.text);
      tx.dir = "auto";
      b.append(time, tx);
      b.addEventListener("click", function () {
        video.currentTime = c.start + 0.01;
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
      });
      li.append(b);
      list.append(li);
      return { c: c, li: li };
    });
    if (!rows.length) list.innerHTML = '<li class="rs-tx-empty">Nothing here for this video.</li>';
    sync(true);
  }
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      mode = tab.dataset.rsTab;
      tabs.forEach(function (x) { x.setAttribute("aria-selected", x === tab ? "true" : "false"); });
      render();
    });
  });
  Promise.all([load("captions"), load("chapters")]).then(function (res) {
    data.captions = res[0]; data.chapters = res[1];
    tabs.forEach(function (x) { if (x.dataset.rsTab === "chapters") x.hidden = !res[1].length; });
    render();
  });
  video.addEventListener("timeupdate", function () { sync(false); });
  video.addEventListener("seeked", function () { sync(false); });
  var lastCap = null;
  video.textTracks.addEventListener("change", function () {
    var src = capSrc();
    if (src === lastCap) return;
    lastCap = src;
    load("captions").then(function (c) { data.captions = c; if (mode === "captions") render(); });
  });
}

const FONTS = {
  sans:    { stack: '"DM Sans", system-ui, sans-serif', g: "DM+Sans:wght@400;500;700" },
  rounded: { stack: 'Nunito, "Arial Rounded MT Bold", system-ui, sans-serif', g: "Nunito:wght@500;700;800" },
  serif:   { stack: 'Fraunces, Georgia, serif', g: "Fraunces:opsz,wght@9..144,400;9..144,600" },
  mono:    { stack: '"JetBrains Mono", ui-monospace, Menlo, monospace', g: "JetBrains+Mono:wght@400;600;700" }
};

const ICON_SETS = { lucide: "Lucide", phosphor: "Phosphor", phosphorFill: "Phosphor Fill", tabler: "Tabler" };

const STYLE_DEFAULTS = {
  minimal: { radius: 12, barH: 3, icons: "lucide", font: "sans" },
  flat:    { radius: 6,  barH: 5, icons: "tabler", font: "sans" },
  glass:   { radius: 18, barH: 4, icons: "phosphor", font: "rounded" },
  brutal:  { radius: 0,  barH: 8, icons: "phosphorFill", font: "mono" },
  retro:   { radius: 4,  barH: 6, icons: "tabler", font: "mono" },
  soft:    { radius: 24, barH: 8, icons: "phosphorFill", font: "rounded" },
  cinema:  { radius: 2,  barH: 3, icons: "lucide", font: "serif" },
  pill:    { radius: 22, barH: 4, icons: "lucide", font: "sans" },
  terminal:{ radius: 0,  barH: 6, icons: "tabler", font: "mono" },
  outline: { radius: 14, barH: 3, icons: "lucide", font: "sans" },
  broadcast:{ radius: 2, barH: 4, icons: "tabler", font: "mono" },
  editorial:{ radius: 0, barH: 2, icons: "lucide", font: "serif" }
};

function svgFrom(def, cls) {
  const a = Object.entries(def.a).map(([k, v]) => `${k}="${v}"`).join(" ");
  return `<svg class="${cls}" viewBox="${def.vb}" ${a} aria-hidden="true">${def.i}</svg>`;
}
const icon = (set, name, cls) => svgFrom(ICONS[set][name], cls);
const hexToRgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const rgbToHex = (r, g, b) => "#" + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, "0")).join("");
const lum = h => { const c = hexToRgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const onColor = h => contrast(h, "#ffffff") >= contrast(h, "#111114") ? "#ffffff" : "#111114";
const rgba = (h, a) => { const [r, g, b] = hexToRgb(h); return `rgba(${r}, ${g}, ${b}, ${a})`; };
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToHex(h, s, l) {
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

/* read the logo's shape language: outline, corners, fills, proportions */
const PRESET_NAMES = { minimal: "Minimal", flat: "Flat", glass: "Glass", brutal: "Neo-brutal", retro: "Retro VHS", soft: "Soft clay", cinema: "Cinema", pill: "Pill dock", terminal: "Terminal", outline: "Outline", broadcast: "Broadcast", editorial: "Editorial" };
function analyzeShape(img, pal) {
  const N = 128, c = document.createElement("canvas");
  const w = img.naturalWidth || N, h = img.naturalHeight || N, sc = Math.min(N / w, N / h);
  const W = c.width = Math.max(1, Math.round(w * sc)), H = c.height = Math.max(1, Math.round(h * sc));
  const x = c.getContext("2d", { willReadFrequently: true });
  x.drawImage(img, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H).data;
  let clear = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 128) clear++;
  const useAlpha = clear > W * H * .04;
  const at = (X, Y) => (Y * W + X) * 4;
  const cs = [at(0, 0), at(W - 1, 0), at(0, H - 1), at(W - 1, H - 1)];
  const bg = [0, 1, 2].map(k => cs.reduce((a, i) => a + d[i + k], 0) / 4);
  const m = new Uint8Array(W * H);
  let area = 0, x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    const i = at(X, Y);
    const on = useAlpha ? d[i + 3] >= 128 : Math.hypot(d[i] - bg[0], d[i + 1] - bg[1], d[i + 2] - bg[2]) > 60;
    if (!on) continue;
    m[Y * W + X] = 1; area++;
    if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y;
  }
  if (area < 20) return null;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const k = Math.max(2, Math.round(Math.min(bw, bh) * .07));
  let cf = 0;
  [[x0, y0], [x1 - k + 1, y0], [x0, y1 - k + 1], [x1 - k + 1, y1 - k + 1]].forEach(([a, b]) => {
    let n = 0;
    for (let Y = b; Y < b + k; Y++) for (let X = a; X < a + k; X++) n += m[Y * W + X] || 0;
    cf += n / (k * k);
  });
  cf /= 4;
  let edge = 0;
  for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) {
    const j = Y * W + X;
    if (m[j] && (!m[j - 1] || !m[j + 1] || !m[j - W] || !m[j + W])) edge++;
  }
  const fill = area / (bw * bh), strokes = edge / area, aspect = bw / bh;
  let lsum = 0;
  for (let j = 0; j < W * H; j++) if (m[j]) { const i = j * 4; lsum += (.2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]) / 255; }
  let bright = 0;
  for (let j = 0; j < W * H; j++) if (m[j]) { const i = j * 4; if ((.2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]) / 255 > .55) bright++; }
  // a logo with bright parts (a colored tile) reads on dark players; an all dark logo gets a white plate
  const logoLum = bright / area >= .15 ? Math.max(.5, lsum / area) : lsum / area;
  const colors = (pal || []).filter(p => p.s > .25 && p.l > .15 && p.l < .85).length;
  const solid = strokes < .2;
  const wide = aspect > 2.2 || aspect < .45;
  let shape;
  if (fill >= .97 && cf > .9) shape = "square";
  else if (fill >= .86 && cf < .9) shape = "rounded";
  else if (fill >= .7 && cf < .5) shape = "circle";
  else shape = "free";
  let out;
  if (wide) out = { style: "editorial", icons: "lucide", font: "serif", radius: 4, barH: 2 };
  else if (!solid) out = { style: "outline", icons: "lucide", font: "sans", radius: shape === "square" ? 4 : 14, barH: 3 };
  else if (shape === "circle") out = { style: "soft", icons: "phosphorFill", font: "rounded", radius: 24, barH: 8 };
  else if (shape === "rounded") out = { style: "glass", icons: "phosphor", font: "rounded", radius: 18, barH: 4 };
  else if (shape === "square") out = colors >= 3 ? { style: "brutal", icons: "phosphorFill", font: "mono", radius: 0, barH: 8 } : { style: "flat", icons: "tabler", font: "sans", radius: 3, barH: 5 };
  else out = { style: "minimal", icons: "phosphorFill", font: "sans", radius: 12, barH: 3 };
  const shapeName = { square: "Sharp corners", rounded: "Soft corners", circle: "Round shape", free: "Free-form shape" }[shape];
  out.wide = wide;
  // find the icon part: the first cluster of columns, if it is roughly square
  const colOn = [];
  for (let X = x0; X <= x1; X++) { let on = 0; for (let Y = y0; Y <= y1; Y++) if (m[Y * W + X]) { on = 1; break; } colOn.push(on); }
  const gapMin = Math.max(2, Math.round(bw * .025));
  let segEnd = -1, run = 0;
  for (let k2 = 0; k2 < colOn.length; k2++) { if (!colOn[k2]) { run++; if (run >= gapMin && segEnd < 0) { segEnd = k2 - run; break; } } else run = 0; }
  let box = null;
  if (segEnd > 0) {
    let sy0 = H, sy1 = 0;
    for (let X = x0; X <= x0 + segEnd; X++) for (let Y = y0; Y <= y1; Y++) if (m[Y * W + X]) { if (Y < sy0) sy0 = Y; if (Y > sy1) sy1 = Y; }
    const sw = segEnd + 1, sh = sy1 - sy0 + 1;
    if (sw <= sh * 1.8 && sw >= sh * .35 && sw < bw * .5) box = [x0, sy0, sw, sh];
  }
  if (!box) box = [x0, y0, Math.min(bw, bh), bh];
  out.symBox = [box[0] / W, box[1] / H, box[2] / W, box[3] / H];
  out.logoLum = logoLum;
  out.chips = [shapeName, solid ? "Solid fills" : "Line art", wide ? "Wordmark" : "Compact mark", colors + (colors === 1 ? " brand color" : " brand colors")];
  out.text = `Reads as ${shapeName.toLowerCase()}, ${solid ? "solid fills" : "line art"}. Suggests ${PRESET_NAMES[out.style]}, ${ICON_SETS[out.icons]} icons, ${out.font} type.`;
  return out;
}

function cropSymbol(img, b) {
  const S = 192, c = document.createElement("canvas");
  c.width = c.height = S;
  const x = c.getContext("2d");
  // draw the whole logo first: SVGs without a size crop from the wrong box otherwise
  const iw = Math.max(1, (img.naturalWidth || 300) * 2), ih = Math.max(1, (img.naturalHeight || 100) * 2);
  const full = document.createElement("canvas");
  full.width = iw; full.height = ih;
  full.getContext("2d").drawImage(img, 0, 0, iw, ih);
  const pad = Math.max(b[2] * iw, b[3] * ih) * .06;
  const sx = Math.max(0, b[0] * iw - pad), sy = Math.max(0, b[1] * ih - pad);
  const sw = Math.min(iw - sx, b[2] * iw + pad * 2), sh = Math.min(ih - sy, b[3] * ih + pad * 2);
  const sc = (S * .84) / Math.max(sw, sh);
  x.drawImage(full, sx, sy, sw, sh, (S - sw * sc) / 2, (S - sh * sc) / 2, sw * sc, sh * sc);
  return c.toDataURL("image/png");
}

function setBrandColor(hex) {
  const [h, s0, l0] = rgbToHsl(...hexToRgb(hex));
  state.hue = Math.round(h);
  state.accent = hex;
  state.bar = hslToHex((h + 14) % 360, Math.max(.45, s0), Math.min(.68, l0 + .08));
  state.surface = hslToHex(h, .32, .1);
  state.text = "#ffffff";
  state.surfaceL = hslToHex(h, .3, .96);
  state.textL = hslToHex(h, .25, .11);
}

function applyDirection(dir) {
  state.direction = dir;
  if (dir === "mark") Object.assign(state, STYLE_DEFAULTS.glass, { style: "glass" });
  else if (dir === "pattern") Object.assign(state, STYLE_DEFAULTS.flat, { style: "flat", barH: 6 });
  else if (dir === "signature" && state.dna) {
    const { style, icons, font, radius, barH } = state.dna;
    Object.assign(state, { style, icons, font, radius, barH, showLogo: true });
  }
}

function extractPalette(img) {
  const c = document.createElement("canvas"), N = 96;
  const w = img.naturalWidth || N, h = img.naturalHeight || N, sc = Math.min(N / w, N / h);
  c.width = Math.max(1, Math.round(w * sc)); c.height = Math.max(1, Math.round(h * sc));
  const x = c.getContext("2d", { willReadFrequently: true });
  x.drawImage(img, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height).data, buckets = new Map();
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 200) continue;
    const k = (d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | (d[i + 2] >> 4);
    const b = buckets.get(k) || { r: 0, g: 0, b: 0, n: 0 };
    b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2]; b.n++;
    buckets.set(k, b);
  }
  const list = [...buckets.values()].map(b => ({ rgb: [b.r / b.n, b.g / b.n, b.b / b.n], n: b.n })).sort((a, b) => b.n - a.n);
  const merged = [];
  for (const c1 of list) {
    const m = merged.find(c2 => Math.hypot(c1.rgb[0] - c2.rgb[0], c1.rgb[1] - c2.rgb[1], c1.rgb[2] - c2.rgb[2]) < 48);
    if (m) m.n += c1.n; else merged.push({ ...c1 });
  }
  return merged.sort((a, b) => b.n - a.n).slice(0, 7).map(c2 => {
    const [h, s, l] = rgbToHsl(...c2.rgb);
    return { hex: rgbToHex(...c2.rgb), n: c2.n, h, s, l };
  });
}

function assignRoles(pal) {
  if (!pal.length) return;
  const chroma = pal.filter(p => p.s > .28 && p.l > .18 && p.l < .82);
  const ranked = [...chroma].sort((a, b) => (b.n * (b.s + .2)) - (a.n * (a.s + .2)));
  const accent = ranked[0] || pal[0];
  const bar = ranked.find(p => p !== accent && Math.abs(p.h - accent.h) > 25) || accent;
  const dark = pal.filter(p => p.l < .22).sort((a, b) => b.n - a.n)[0];
  state.accent = accent.hex;
  state.bar = bar.hex;
  state.surface = dark ? dark.hex : hslToHex(accent.h, Math.min(.35, accent.s), .1);
  state.text = lum(state.surface) < .35 ? "#ffffff" : "#141416";
  state.surfaceL = hslToHex(accent.h, .3, .96);
  state.textL = hslToHex(accent.h, .25, .11);
  state.hue = Math.round(accent.h);
}

function buildCSS(s, exp = true) {
  const font = FONTS[s.font];
  const light = s.mode === "light";
  const logoDark = s.logoLum < .45;
  const plate = logoDark ? "#f7f7f4" : (light ? s.text : s.surface);
  const sf = light ? s.surfaceL : s.surface, tx = light ? s.textL : s.text;
  // accent used as text: nudged toward white or black until it reads on its background
  const mixHex = (a, b, t) => { const A = hexToRgb(a), Z = hexToRgb(b); return rgbToHex(...A.map((v, i) => v + (Z[i] - v) * t)); };
  const readable = (c, bg, min) => { let x = c; const to = lum(bg) < .4 ? "#ffffff" : "#000000"; for (let i = 0; i < 14 && contrast(x, bg) < min; i++) x = mixHex(x, to, .16); return x; };
  const platesNeeded = Math.abs(s.logoLum - lum(sf) ** .45) < .35;
  const plateCSS = `
/* logo plates keep your logo readable on any background */
.rs-logo { ${logoDark ? "background: var(--rs-plate); padding: 5px 9px; box-sizing: content-box; height: 22px; border-radius: min(var(--rs-radius), 8px);" : "filter: drop-shadow(0 1px 3px rgb(0 0 0 / .5));"} }
${platesNeeded ? ".rs-tx-brand { background: var(--rs-plate); padding: 4px 8px; border-radius: min(var(--rs-radius), 8px); }" : ""}`;
  const autoBlock = s.mode !== "auto" ? "" : `
/* Auto: follows the viewer's light or dark setting */
@media (prefers-color-scheme: light) {
:where(.rs-layout, .rs-player) { --rs-surface: ${s.surfaceL}; --rs-text: ${s.textL}; }
}`;
  const vars = `:where(.rs-layout, .rs-player) {
--rs-accent: ${s.accent};
--rs-on-accent: ${onColor(s.accent)};
--rs-bar: ${s.bar};
--rs-surface: ${sf};
--rs-text: ${tx};
--rs-font: ${font.stack};
--rs-size: ${s.size}px;
--rs-radius: ${s.radius}px;
--rs-bar-h: ${s.barH}px;
--rs-aspect: ${s.aspect};
--rs-plate: ${plate};${s.direction === "mark" || s.direction === "pattern" ? `\n  --rs-logo: url("${exp ? "your-logo.svg" : s.logo}");` : ""}${s.direction === "mark" && (s.symbol || !s.wide) ? `\n  --rs-mark: url("${exp ? (s.symbol ? "your-symbol.svg" : "your-logo.svg") : (s.symbol || s.logo)}");` : ""}
}`;

  const base = `
/* ---------- player ---------- */
video-player { display: block; }
.rs-player {
position: relative; display: block; width: 100%;
aspect-ratio: var(--rs-aspect);
overflow: hidden; isolation: isolate;
container: rs-player / inline-size;
background: #000;
border-radius: var(--rs-radius);
font-family: var(--rs-font); font-size: var(--rs-size);
color: var(--rs-text);
-webkit-tap-highlight-color: transparent;
}
.rs-player:focus-visible { outline: 3px solid var(--rs-accent); outline-offset: 3px; }
.rs-player:fullscreen { border-radius: 0; }
.rs-player video, .rs-player youtube-video, .rs-player vimeo-video {
position: absolute; inset: 0; width: 100%; height: 100%; min-width: 0; min-height: 0;
object-fit: var(--rs-fit, contain); display: block;
}
/* captions: drawn by the browser, styled here */
.rs-player video::cue {
font-family: ${font.stack};
font-weight: 600;
color: #ffffff;
background-color: ${rgba(lum(s.surface) < .2 ? s.surface : "#111114", .82)};
text-shadow: 0 1px 2px rgb(0 0 0 / .6);
}
.rs-backfill {
position: absolute; inset: -10%; width: 120%; height: 120%; display: block;
filter: blur(26px) saturate(1.25) brightness(.7); pointer-events: none;
}
.rs-logo {
position: absolute; z-index: 3; top: 14px; right: 14px;
height: 30px; width: auto; max-width: 30%; object-fit: contain;
pointer-events: none;
}
.rs-center { position: absolute; inset: 0; z-index: 3; display: grid; place-items: center; pointer-events: none; }
.rs-big {
pointer-events: auto; cursor: pointer;
display: grid; place-items: center;
width: max(64px, 4.9em); height: max(64px, 4.9em);
transition: opacity .2s ease, scale .25s ease, background .15s ease;
}
.rs-big svg { width: 42%; height: 42%; }
.rs-big:not([data-paused]) { opacity: 0; scale: .85; pointer-events: none; }
.rs-big:focus-visible { outline: 3px solid var(--rs-accent); outline-offset: 4px; }

.rs-icon-pause, .rs-icon-replay, .rs-icon-muted, .rs-icon-exit { display: none; }
media-play-button:not([data-paused]) .rs-icon-play { display: none; }
media-play-button:not([data-paused]) .rs-icon-pause { display: block; }
media-play-button[data-ended] .rs-icon-play { display: none; }
media-play-button[data-ended] .rs-icon-replay { display: block; }
media-mute-button[data-muted] .rs-icon-volume { display: none; }
media-mute-button[data-muted] .rs-icon-muted { display: block; }
media-fullscreen-button[data-fullscreen] .rs-icon-enter { display: none; }
media-fullscreen-button[data-fullscreen] .rs-icon-exit { display: block; }
media-captions-button:not([data-active]) { opacity: .6; }
media-captions-button[data-active] { background: color-mix(in srgb, var(--rs-accent) 26%, transparent); }

.rs-backdrop { position: absolute; inset: auto 0 0; height: 50%; z-index: 3; pointer-events: none; transition: opacity .3s ease; }
.rs-controls {
position: absolute; z-index: 4; left: 0; right: 0; bottom: 0;
display: flex; flex-direction: column; gap: .25em;
padding: .55em .7em;
transition: opacity .25s ease, translate .25s ease;
}
.rs-controls:not([data-visible]), .rs-backdrop:not([data-visible]) { opacity: 0; }
.rs-controls:not([data-visible]) { translate: 0 6px; pointer-events: none; }

.rs-rail { position: relative; display: flex; align-items: center; height: max(24px, 1.6em); cursor: pointer; touch-action: none; }
.rs-chapters { position: relative; display: block; width: 100%; height: 100%; }
.rs-seg {
position: absolute; inset: 0; display: flex; align-items: center;
clip-path: inset(0 calc(100% - var(--media-slider-chapter-end)) 0 var(--media-slider-chapter-start));
}
.rs-track {
position: relative; display: block; width: 100%;
height: var(--rs-bar-h);
border-radius: min(var(--rs-radius), calc(var(--rs-bar-h) / 2));
background: color-mix(in srgb, var(--rs-text) 26%, transparent);
overflow: hidden;
transition: height .15s ease;
}
.rs-seg .rs-track {
position: absolute; left: 0; right: 0;
clip-path: inset(0 calc(100% - var(--media-slider-chapter-end) + 2px) 0 calc(var(--media-slider-chapter-start) + 1px) round min(var(--rs-radius), calc(var(--rs-bar-h) / 2)));
}
.rs-rail[data-pointing] .rs-track, .rs-rail[data-dragging] .rs-track { height: calc(var(--rs-bar-h) + 3px); }
.rs-buf, .rs-fill { position: absolute; inset-block: 0; left: 0; display: block; }
.rs-buf { width: var(--media-slider-buffer); background: color-mix(in srgb, var(--rs-text) 22%, transparent); }
.rs-fill { width: var(--media-slider-fill); background: var(--rs-bar); }
.rs-rail[data-dragging] .rs-fill { width: var(--media-slider-pointer); }
.rs-thumb {
position: absolute; top: 50%; left: var(--media-slider-fill);
width: calc(var(--rs-bar-h) + 9px); height: calc(var(--rs-bar-h) + 9px);
translate: -50% -50%; scale: 0;
background: var(--rs-bar);
border-radius: min(var(--rs-radius), 50%);
transition: scale .15s ease;
}
.rs-rail[data-interactive] .rs-thumb, .rs-rail:focus-visible .rs-thumb { scale: 1; }
.rs-rail:focus-visible { outline: 2px solid var(--rs-accent); outline-offset: 2px; border-radius: 4px; }
.rs-rail[data-dragging] .rs-thumb { left: var(--media-slider-pointer); }
.rs-preview {
position: absolute; bottom: calc(100% + 8px);
left: clamp(var(--rs-pv-half, 96px), var(--media-slider-pointer), calc(100% - var(--rs-pv-half, 96px)));
translate: 0 4px;
display: grid; justify-items: center; gap: 1px;
padding: .35em .7em;
background: var(--rs-surface); color: var(--rs-text);
border-radius: min(var(--rs-radius), 10px);
white-space: nowrap; pointer-events: none;
opacity: 0; transition: opacity .15s ease, translate .15s ease;
}
.rs-rail[data-pointing] .rs-preview, .rs-rail[data-dragging] .rs-preview { opacity: 1; translate: 0 0; }
.rs-preview-title { font-weight: 600; font-size: .9em; }
.rs-preview-thumb {
display: block; min-width: 128px; max-width: 168px; max-height: 120px;
margin: .15em 0 .3em; border-radius: max(4px, calc(min(var(--rs-radius), 10px) - 4px)); overflow: hidden;
}
.rs-preview-thumb[data-hidden] { display: none; }
.rs-preview-title:empty { display: none; }
.rs-preview-time { font-size: .82em; font-variant-numeric: tabular-nums; opacity: .8; }

.rs-row { display: flex; align-items: center; gap: .15em; }
:where(button).rs-btn { appearance: none; background: none; border: 0; padding: 0; margin: 0; font: inherit; color: var(--rs-text); }
.rs-spacer { flex: 1; }
.rs-btn {
display: grid; place-items: center; flex: none;
width: max(40px, 2.6em); height: max(40px, 2.6em);
border-radius: calc(var(--rs-radius) * .6);
color: var(--rs-text); cursor: pointer;
transition: background .15s ease, color .15s ease;
}
.rs-btn svg { width: max(20px, 1.4em); height: max(20px, 1.4em); }
.rs-btn:focus-visible { outline: 2px solid var(--rs-accent); outline-offset: 1px; }
.rs-btn[data-hidden], .rs-btn[hidden] { display: none; }
.rs-rate { width: auto; padding: 0 .6em; font-weight: 700; font-size: .9em; font-variant-numeric: tabular-nums; }
.rs-rate::after { content: attr(data-rate) "×"; }
.rs-time { display: inline-flex; gap: .3em; padding: 0 .4em; font-size: .9em; font-variant-numeric: tabular-nums; white-space: nowrap; }
.rs-time-dur, .rs-time media-time-separator { opacity: .7; }

.rs-volume { display: flex; align-items: center; }
.rs-vol {
position: relative; display: flex; align-items: center;
width: 0; height: max(40px, 2.6em); overflow: hidden; cursor: pointer;
transition: width .2s ease, margin .2s ease;
}
.rs-volume:hover .rs-vol, .rs-volume:focus-within .rs-vol { width: 5.5em; margin-right: .5em; overflow: visible; }
.rs-vol-track { position: relative; display: block; width: 100%; height: 4px; border-radius: 4px; background: color-mix(in srgb, var(--rs-text) 30%, transparent); overflow: hidden; }
.rs-vol-fill { position: absolute; inset-block: 0; left: 0; width: var(--media-slider-fill); background: var(--rs-text); }
.rs-vol-thumb { position: absolute; top: 50%; left: var(--media-slider-fill); width: 12px; height: 12px; border-radius: 50%; background: var(--rs-text); translate: -50% -50%; }
.rs-vol:focus-visible { outline: 2px solid var(--rs-accent); outline-offset: 2px; }
.rs-vol[data-hidden] { display: none; }

.rs-buffering { position: absolute; inset: 0; z-index: 2; display: grid; place-items: center; pointer-events: none; }
.rs-buffering::after {
content: ""; width: 2.6em; height: 2.6em; border-radius: 50%;
border: 3px solid color-mix(in srgb, var(--rs-text) 25%, transparent);
border-top-color: var(--rs-accent);
opacity: 0;
}
.rs-buffering[data-visible]::after { opacity: 1; animation: rs-spin .8s linear infinite; }
@keyframes rs-spin { to { rotate: 1turn; } }

@container rs-player (max-width: 460px) {
.rs-volume .rs-vol { display: none; }
.rs-time-dur, .rs-time media-time-separator { display: none; }
.rs-controls { padding-inline: .45em; }
}
media-gesture, media-hotkey { display: none; }

/* ---------- settings menu ---------- */
.rs-menu {
--media-menu-side-offset: 10px;
position: relative; box-sizing: border-box;
width: var(--media-menu-width); min-width: 200px;
max-width: var(--media-menu-available-width, var(--media-popover-available-width, none));
height: var(--media-menu-height);
max-height: var(--media-menu-available-height, var(--media-popover-available-height, none));
padding: 0; overflow: hidden;
font-family: var(--rs-font); font-size: var(--rs-size); color: var(--rs-text);
background: color-mix(in srgb, var(--rs-surface) 94%, transparent);
border-radius: min(var(--rs-radius), 14px);
box-shadow: 0 16px 36px -10px rgb(0 0 0 / .55), inset 0 0 0 1px color-mix(in srgb, var(--rs-text) 12%, transparent);
transition: width .22s ease, height .22s ease, opacity .15s ease;
}
.rs-menu, .rs-menu-root, .rs-menu-panel { outline: none; }
.rs-menu-root, .rs-menu-panel {
position: absolute; inset: 0; display: grid; align-content: start; gap: 2px;
padding: 6px; overflow: auto; outline: none;
transition: translate .22s ease, opacity .22s ease;
}
/* closed submenus carry [hidden]; the display: grid above would otherwise show them stacked on the root list */
.rs-menu-root[hidden], .rs-menu-panel[hidden],
.rs-menu-panel[data-submenu]:not([data-open]):not([data-ending-style]) { display: none !important; }
.rs-menu-root[data-child-open] { translate: -100% 0; opacity: 0; }
.rs-menu-panel[data-submenu] { z-index: 1; }
.rs-menu-panel[data-submenu][data-starting-style], .rs-menu-panel[data-submenu][data-ending-style] { translate: 100% 0; opacity: 0; pointer-events: none; }
.rs-menu-item, .rs-menu-back {
display: flex; align-items: center; justify-content: space-between; gap: 14px;
min-height: 40px; padding: 0 12px; cursor: pointer;
border-radius: max(4px, calc(min(var(--rs-radius), 14px) - 6px));
}
.rs-menu-item[data-highlighted], .rs-menu-back[data-highlighted], .rs-menu-back:hover { background: color-mix(in srgb, var(--rs-text) 12%, transparent); }
.rs-menu-item[data-availability="unavailable"] { display: none; }
.rs-menu-back { justify-content: flex-start; font-weight: 700; }
.rs-menu-value { display: inline-flex; align-items: center; gap: 8px; opacity: .72; }
.rs-menu-group { display: grid; gap: 2px; }
.rs-menu-check { opacity: 0; color: var(--rs-accent); font-weight: 800; }
media-menu-radio-item[aria-checked="true"] .rs-menu-check { opacity: 1; }
media-menu-radio-item[aria-checked="true"] { font-weight: 700; }
.rs-settings[aria-expanded="true"] svg { rotate: 60deg; }
.rs-settings svg { transition: rotate .3s ease; }

/* respect "reduce transparency" and "more contrast" */
@media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
.rs-controls, .rs-big, .rs-preview, .rs-menu, .rs-transcript { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
.rs-menu, .rs-preview { background: var(--rs-surface); }
}

/* ---------- transcript panel ---------- */
.rs-layout {
display: grid; grid-template-columns: minmax(0, 1fr) minmax(240px, 300px);
gap: 16px; align-items: stretch;
}
@media (max-width: 760px) {
.rs-layout { grid-template-columns: minmax(0, 1fr); }
.rs-transcript { height: 300px; }
}
.rs-transcript {
position: relative; min-height: 260px; overflow: hidden;
background: var(--rs-surface); color: var(--rs-text);
font-family: var(--rs-font); font-size: var(--rs-size);
border-radius: var(--rs-radius);
}
.rs-tx-tabs { display: flex; gap: 4px; height: 56px; align-items: center; padding: 0 10px; border-bottom: 1px solid color-mix(in srgb, var(--rs-text) 14%, transparent); }
.rs-tx-tabs button {
font: inherit; font-size: .9em; font-weight: 700; color: inherit;
background: none; border: 0; cursor: pointer;
min-height: 36px; padding: 0 .9em; border-radius: calc(var(--rs-radius) * .5);
opacity: .78;
}
.rs-tx-tabs button[aria-selected="true"] { opacity: 1; background: color-mix(in srgb, var(--rs-text) 12%, transparent); }
.rs-tx-tabs button:focus-visible { outline: 2px solid var(--rs-accent); }
.rs-tx-brand { margin-left: auto; height: 22px; width: auto; min-width: 0; max-width: 34%; flex: 0 1 auto; object-fit: contain; object-position: right center; box-sizing: content-box; }
.rs-tx-list {
position: absolute; inset: 57px 0 0 0; overflow: auto;
margin: 0; padding: 8px; list-style: none;
display: grid; align-content: start; gap: 2px;
}
.rs-tx-line {
all: unset; box-sizing: border-box; width: 100%;
display: grid; grid-template-columns: 3em minmax(0, 1fr); gap: .5em;
padding: .55em .65em; border-radius: calc(var(--rs-radius) * .5);
line-height: 1.45; cursor: pointer; opacity: .8;
}
.rs-tx-line:hover { opacity: .95; background: color-mix(in srgb, var(--rs-text) 7%, transparent); }
.rs-tx-line:focus-visible { outline: 2px solid var(--rs-accent); opacity: 1; }
.rs-tx-list li[data-active] .rs-tx-line { opacity: 1; background: color-mix(in srgb, var(--rs-text) 10%, transparent); box-shadow: inset 3px 0 0 var(--rs-accent); }
.rs-tx-time { font-size: .82em; padding-top: .15em; font-variant-numeric: tabular-nums; }
.rs-tx-text strong { font-weight: 800; }
.rs-tx-empty { padding: 1em; opacity: .7; }

@media (prefers-reduced-motion: reduce) {
.rs-controls, .rs-backdrop, .rs-big, .rs-thumb, .rs-preview, .rs-track, .rs-vol, .rs-menu, .rs-menu-root, .rs-menu-panel, .rs-settings svg { transition: none; }
.rs-buffering[data-visible]::after { animation-duration: 2.4s; }
}`;

  const styles = {
    minimal: `
/* ---------- style: minimal ---------- */
.rs-backdrop { background: linear-gradient(to top, color-mix(in srgb, var(--rs-surface) 78%, transparent), color-mix(in srgb, var(--rs-surface) 30%, transparent) 60%, transparent); }
.rs-controls { padding: .7em 1em .8em; }
.rs-btn svg, .rs-time { filter: drop-shadow(0 1px 2px rgb(0 0 0 / .45)); }
.rs-btn:hover { background: color-mix(in srgb, var(--rs-text) 12%, transparent); }
.rs-big {
border-radius: 50%;
border: 1.5px solid var(--rs-text);
color: var(--rs-text);
background: color-mix(in srgb, var(--rs-surface) 35%, transparent);
}
.rs-big:hover { background: var(--rs-accent); border-color: var(--rs-accent); color: var(--rs-on-accent); }
.rs-thumb { box-shadow: 0 0 0 3px color-mix(in srgb, var(--rs-surface) 40%, transparent); }`,

    flat: `
/* ---------- style: flat ---------- */
.rs-backdrop { display: none; }
.rs-controls { background: var(--rs-surface); padding: .2em .55em .4em; gap: .05em; }
.rs-rail { margin-inline: .2em; }
.rs-btn { border-radius: calc(var(--rs-radius) * .7); }
.rs-btn:hover { background: color-mix(in srgb, var(--rs-text) 10%, transparent); }
.rs-row .rs-play { background: var(--rs-accent); color: var(--rs-on-accent); }
.rs-row .rs-play:hover { background: color-mix(in srgb, var(--rs-accent) 85%, var(--rs-text)); }
.rs-big { border-radius: var(--rs-radius); background: var(--rs-accent); color: var(--rs-on-accent); }
.rs-big:hover { background: color-mix(in srgb, var(--rs-accent) 85%, #000); }
.rs-thumb { box-shadow: 0 0 0 3px var(--rs-surface); }`,

    glass: `
/* ---------- style: glass ---------- */
.rs-backdrop { background: linear-gradient(to top, rgb(0 0 0 / .35), transparent); }
.rs-controls {
left: .8em; right: .8em; bottom: .8em;
padding: .25em .6em .3em;
border-radius: calc(var(--rs-radius) + 2px);
background: color-mix(in srgb, var(--rs-surface) 55%, transparent);
border: 1px solid color-mix(in srgb, var(--rs-text) 20%, transparent);
backdrop-filter: blur(18px) saturate(1.5);
-webkit-backdrop-filter: blur(18px) saturate(1.5);
box-shadow: 0 12px 32px -10px rgb(0 0 0 / .45);
}
.rs-btn:hover { background: color-mix(in srgb, var(--rs-text) 14%, transparent); }
.rs-big {
border-radius: 50%;
color: var(--rs-text);
background: color-mix(in srgb, var(--rs-surface) 45%, transparent);
border: 1px solid color-mix(in srgb, var(--rs-text) 30%, transparent);
backdrop-filter: blur(16px) saturate(1.5);
-webkit-backdrop-filter: blur(16px) saturate(1.5);
box-shadow: 0 16px 40px -12px rgb(0 0 0 / .5);
}
.rs-big:hover { background: color-mix(in srgb, var(--rs-accent) 75%, transparent); color: var(--rs-on-accent); }
.rs-preview {
background: color-mix(in srgb, var(--rs-surface) 65%, transparent);
backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
border: 1px solid color-mix(in srgb, var(--rs-text) 18%, transparent);
}
.rs-thumb { box-shadow: 0 0 12px 2px color-mix(in srgb, var(--rs-bar) 60%, transparent); }
.rs-transcript {
background: color-mix(in srgb, var(--rs-surface) 88%, transparent);
border: 1px solid color-mix(in srgb, var(--rs-text) 14%, transparent);
box-shadow: 0 16px 40px -18px rgb(0 0 0 / .5);
}`,

    brutal: `
/* ---------- style: neo-brutal ---------- */
.rs-backdrop { display: none; }
.rs-controls {
left: .8em; right: calc(.8em + 5px); bottom: calc(.8em + 5px);
padding: .3em .55em .4em;
background: var(--rs-surface);
border: 3px solid var(--rs-text);
border-radius: var(--rs-radius);
box-shadow: 5px 5px 0 var(--rs-text);
}
.rs-track { background: color-mix(in srgb, var(--rs-text) 32%, transparent); }
.rs-fill { box-shadow: inset -2px 0 0 var(--rs-text); }
.rs-thumb { border: 2px solid var(--rs-text); background: var(--rs-accent); }
.rs-btn { border: 2px solid transparent; }
.rs-btn:hover { border-color: var(--rs-text); background: var(--rs-accent); color: var(--rs-on-accent); }
.rs-time { font-weight: 700; text-transform: uppercase; }
.rs-big {
border-radius: var(--rs-radius);
background: var(--rs-accent); color: var(--rs-on-accent);
border: 3px solid var(--rs-text);
box-shadow: 6px 6px 0 var(--rs-text);
}
.rs-big:hover { translate: 2px 2px; box-shadow: 4px 4px 0 var(--rs-text); }
.rs-preview { border: 2px solid var(--rs-text); box-shadow: 3px 3px 0 var(--rs-text); }
.rs-transcript { border: 3px solid var(--rs-text); box-shadow: 5px 5px 0 var(--rs-text); }
.rs-tx-list li[data-active] .rs-tx-line { background: var(--rs-accent); color: var(--rs-on-accent); box-shadow: none; }`,
    retro: `
/* ---------- style: retro VHS ---------- */
.rs-backdrop { display: none; }
.rs-controls {
background: var(--rs-surface); padding: .25em .6em .45em;
}
.rs-controls::before, .rs-transcript::before {
content: ""; position: absolute; left: 0; right: 0; top: -9px; height: 9px;
background: linear-gradient(var(--rs-bar) 0 33%, var(--rs-accent) 33% 66%, color-mix(in srgb, var(--rs-accent) 55%, #000) 66%);
}
.rs-transcript::before { top: 0; z-index: 1; }
.rs-transcript .rs-tx-tabs { margin-top: 9px; }
.rs-transcript .rs-tx-list { top: 66px; }
.rs-track { border-radius: 0; }
.rs-fill { background: repeating-linear-gradient(90deg, var(--rs-bar) 0 6px, transparent 6px 8px); }
.rs-thumb { border-radius: 1px; width: 6px; height: calc(var(--rs-bar-h) + 12px); background: var(--rs-text); }
.rs-time {
text-transform: uppercase; letter-spacing: .08em; font-weight: 700;
color: var(--rs-accent); background: color-mix(in srgb, #000 55%, var(--rs-surface));
padding: .3em .6em; border-radius: 3px;
}
.rs-btn { border-radius: 3px; }
.rs-btn:hover { background: color-mix(in srgb, var(--rs-text) 12%, transparent); }
.rs-big {
width: auto; height: auto; padding: .7em 1.2em; gap: .5em; grid-auto-flow: column;
border-radius: 4px; background: var(--rs-surface); color: var(--rs-accent);
border: 2px solid var(--rs-accent);
box-shadow: 0 0 0 4px var(--rs-surface);
}
.rs-big svg { width: 2em; height: 2em; }
.rs-big:hover { background: var(--rs-accent); color: var(--rs-on-accent); }
`,

    soft: `
/* ---------- style: soft clay ---------- */
.rs-backdrop { background: linear-gradient(to top, rgb(0 0 0 / .3), transparent); }
.rs-controls {
left: .9em; right: .9em; bottom: .9em; padding: .35em .7em .45em;
background: var(--rs-surface); border-radius: calc(var(--rs-radius) + 4px);
box-shadow: 0 14px 30px -10px rgb(0 0 0 / .55), inset 0 2px 0 color-mix(in srgb, var(--rs-text) 16%, transparent), inset 0 -4px 0 rgb(0 0 0 / .22);
}
.rs-btn { border-radius: 50%; }
.rs-btn:hover { background: color-mix(in srgb, var(--rs-text) 10%, transparent); box-shadow: inset 0 2px 0 color-mix(in srgb, var(--rs-text) 14%, transparent), inset 0 -2px 0 rgb(0 0 0 / .25); }
.rs-row .rs-play { background: var(--rs-accent); color: var(--rs-on-accent); box-shadow: inset 0 2px 0 rgb(255 255 255 / .3), inset 0 -3px 0 rgb(0 0 0 / .25), 0 6px 14px -6px var(--rs-accent); }
.rs-track { box-shadow: inset 0 2px 3px rgb(0 0 0 / .35); }
.rs-thumb { background: var(--rs-text); box-shadow: 0 3px 8px rgb(0 0 0 / .4); }
.rs-big {
border-radius: 50%; background: var(--rs-accent); color: var(--rs-on-accent);
box-shadow: 0 18px 36px -10px rgb(0 0 0 / .55), inset 0 3px 0 rgb(255 255 255 / .35), inset 0 -6px 0 rgb(0 0 0 / .25);
}
.rs-big:hover { scale: 1.05; }
.rs-transcript { box-shadow: 0 14px 30px -12px rgb(0 0 0 / .45), inset 0 2px 0 color-mix(in srgb, var(--rs-text) 12%, transparent); }`,

    cinema: `
/* ---------- style: cinema ---------- */
.rs-backdrop { height: 60%; background: linear-gradient(to top, rgb(0 0 0 / .88), rgb(0 0 0 / .4) 50%, transparent); }
.rs-controls { padding: 0; gap: 0; }
.rs-row { order: 1; padding: .3em 1.1em .2em; }
.rs-rail { order: 2; height: 16px; }
.rs-track { border-radius: 0; background: rgb(255 255 255 / .18); }
.rs-seg .rs-track { clip-path: inset(0 calc(100% - var(--media-slider-chapter-end) + 1px) 0 var(--media-slider-chapter-start)); }
.rs-thumb { width: 2px; height: 14px; border-radius: 0; background: var(--rs-text); }
.rs-time { letter-spacing: .14em; text-transform: uppercase; font-size: .8em; }
.rs-btn { color: rgb(255 255 255 / .82); }
.rs-btn:hover { color: var(--rs-accent); background: none; }
.rs-big { background: none; color: #fff; filter: drop-shadow(0 4px 18px rgb(0 0 0 / .7)); width: 6em; height: 6em; }
.rs-big svg { width: 60%; height: 60%; }
.rs-big:hover { color: var(--rs-accent); }
.rs-transcript { background: #0b0b0c; color: #e9e6df; }`,

    pill: `
/* ---------- style: pill dock ---------- */
.rs-backdrop { background: linear-gradient(to top, rgb(0 0 0 / .3), transparent); }
.rs-controls { padding: .7em; gap: .5em; }
.rs-rail {
padding: 0 1em; border-radius: 999px;
background: color-mix(in srgb, var(--rs-surface) 72%, transparent);
backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
}
.rs-row { gap: .45em; }
.rs-btn, .rs-time {
border-radius: 999px;
background: color-mix(in srgb, var(--rs-surface) 72%, transparent);
backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
}
.rs-time { height: max(40px, 2.6em); align-items: center; padding: 0 1em; }
.rs-btn:hover { background: var(--rs-accent); color: var(--rs-on-accent); }
.rs-row .rs-play { background: var(--rs-text); color: var(--rs-surface); }
.rs-volume { border-radius: 999px; background: color-mix(in srgb, var(--rs-surface) 72%, transparent); }
.rs-volume .rs-btn { background: none; backdrop-filter: none; -webkit-backdrop-filter: none; }
.rs-preview { border-radius: 999px; }
.rs-big { border-radius: 999px; background: var(--rs-text); color: var(--rs-surface); box-shadow: 0 12px 30px -8px rgb(0 0 0 / .5); }
.rs-big:hover { background: var(--rs-accent); color: var(--rs-on-accent); }
.rs-tx-line, .rs-tx-tabs button { border-radius: 999px; }
.rs-tx-line { border-radius: 14px; }`,

    terminal: `
/* ---------- style: terminal ---------- */
.rs-backdrop { display: none; }
.rs-controls {
left: .7em; right: .7em; bottom: .7em; padding: .3em .5em .4em;
background: var(--rs-surface); border: 1px dashed var(--rs-accent); border-radius: var(--rs-radius);
}
.rs-track { border-radius: 0; background: repeating-linear-gradient(90deg, color-mix(in srgb, var(--rs-text) 30%, transparent) 0 4px, transparent 4px 7px); }
.rs-fill { background: repeating-linear-gradient(90deg, var(--rs-bar) 0 4px, transparent 4px 7px); }
.rs-buf { background: none; }
.rs-thumb { border-radius: 0; width: 8px; background: var(--rs-text); }
.rs-btn { border-radius: 0; border: 1px solid transparent; }
.rs-btn:hover { border-color: var(--rs-accent); color: var(--rs-accent); background: none; }
.rs-time::before { content: ">"; color: var(--rs-accent); }
.rs-time::after { content: "_"; color: var(--rs-accent); animation: rs-blink 1s steps(1) infinite; }
@keyframes rs-blink { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .rs-time::after { animation: none; } }
.rs-big { border-radius: 0; background: var(--rs-surface); color: var(--rs-accent); border: 1px dashed var(--rs-accent); }
.rs-big:hover { background: var(--rs-accent); color: var(--rs-on-accent); }
.rs-transcript { border: 1px dashed var(--rs-accent); }
.rs-tx-line { border-radius: 0; }
.rs-tx-list li[data-active] .rs-tx-line { box-shadow: inset 2px 0 0 var(--rs-accent); }`,
    outline: `
/* ---------- style: outline ---------- */
.rs-backdrop { background: linear-gradient(to top, color-mix(in srgb, var(--rs-surface) 60%, transparent), transparent); }
.rs-controls { left: .8em; right: .8em; bottom: .8em; padding: .3em .5em .45em; border: 1.5px solid color-mix(in srgb, var(--rs-text) 75%, transparent); border-radius: calc(var(--rs-radius) + 2px); }
.rs-row { gap: .35em; }
.rs-btn { border: 1.5px solid color-mix(in srgb, var(--rs-text) 35%, transparent); }
.rs-btn:hover { border-color: var(--rs-accent); color: var(--rs-accent); }
.rs-track { background: transparent; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--rs-text) 55%, transparent); }
.rs-thumb { background: transparent; border: 2px solid var(--rs-bar); }
.rs-big { border-radius: 50%; border: 2px solid var(--rs-text); color: var(--rs-text); background: transparent; }
.rs-big:hover { border-color: var(--rs-accent); background: var(--rs-accent); color: var(--rs-on-accent); }
.rs-transcript { border: 1.5px solid color-mix(in srgb, var(--rs-text) 30%, transparent); }`,

    broadcast: `
/* ---------- style: broadcast ---------- */
.rs-backdrop { display: none; }
.rs-controls { padding: 0; gap: 0; background: color-mix(in srgb, var(--rs-surface) 94%, #000); }
.rs-rail {
height: 24px; padding: 0 .7em;
background: repeating-linear-gradient(90deg, color-mix(in srgb, var(--rs-text) 28%, transparent) 0 1px, transparent 1px 2.5%) center bottom / calc(100% - 1.4em) 5px no-repeat;
}
.rs-track { border-radius: 0; }
.rs-thumb { width: 2px; height: 20px; border-radius: 0; background: var(--rs-accent); }
.rs-row { padding: .15em .35em; border-top: 1px solid color-mix(in srgb, var(--rs-text) 12%, transparent); }
.rs-btn { border-radius: 2px; }
.rs-btn:hover { background: color-mix(in srgb, var(--rs-text) 10%, transparent); }
.rs-time { color: ${readable(s.accent, mixHex(s.surface, "#000000", .35), 9)}; background: ${mixHex(s.surface, "#000000", .35)}; padding: .35em .6em; border-radius: 2px; letter-spacing: .06em; font-weight: 600; }
.rs-time .rs-time-dur, .rs-time media-time-separator { opacity: .85; }
.rs-time::before { content: "TC"; opacity: .55; margin-right: .3em; }
.rs-big { border-radius: 2px; background: var(--rs-surface); color: var(--rs-accent); box-shadow: inset 0 0 0 1px var(--rs-accent); }
.rs-big:hover { background: var(--rs-accent); color: var(--rs-on-accent); }
.rs-preview { border-radius: 2px; }
.rs-transcript { border-radius: 2px; }
.rs-tx-time { color: ${readable(s.accent, sf, 11)}; opacity: 1; }`,

    editorial: `
/* ---------- style: editorial ---------- */
.rs-backdrop { height: 55%; background: linear-gradient(to top, color-mix(in srgb, var(--rs-surface) 88%, transparent), transparent); }
.rs-controls { padding: .8em 1.2em .9em; gap: .4em; }
.rs-row { border-top: 1px solid color-mix(in srgb, var(--rs-text) 40%, transparent); padding-top: .35em; }
.rs-time { font-style: italic; letter-spacing: .02em; }
.rs-btn:hover { background: none; color: var(--rs-accent); }
.rs-thumb { width: 9px; height: 9px; border-radius: 50%; }
.rs-big {
width: auto; height: auto; padding: .7em 1.4em .7em 1.1em; gap: .45em; grid-auto-flow: column;
border-radius: 999px; border: 1px solid var(--rs-text); color: var(--rs-text);
background: color-mix(in srgb, var(--rs-surface) 55%, transparent);
}
.rs-big svg { width: 1.3em; height: 1.3em; }
.rs-big::after { content: "Play"; font-style: italic; font-size: 1.15em; }
.rs-big[data-ended]::after { content: "Again"; }
.rs-big:hover { background: var(--rs-text); color: var(--rs-surface); }
.rs-transcript { border-radius: 0; }
.rs-tx-line { line-height: 1.6; border-radius: 0; }
.rs-tx-text strong { font-variant: small-caps; letter-spacing: .04em; font-weight: 600; }
.rs-tx-list li[data-active] .rs-tx-line { background: none; box-shadow: inset 2px 0 0 var(--rs-accent); }`

  };

  // A dark logo or symbol disappears on a dark player, so it sits in a white circle with a soft shadow.
  const markPlate = !logoDark || (s.wide && !s.symbol) ? "" : `
/* dark mark: a white circle keeps it readable */
${s.wide ? "" : `.rs-player .rs-big {
border-radius: 50%; background: var(--rs-mark) center / 60% no-repeat, #ffffff;
filter: none; box-shadow: 0 16px 34px -12px rgb(0 0 0 / .6), 0 0 0 1px rgb(0 0 0 / .06);
}
`}.rs-player .rs-thumb {
width: 26px; height: 26px; border-radius: 50%;
background: var(--rs-mark) center / 64% no-repeat, #ffffff;
filter: none; box-shadow: 0 2px 8px rgb(0 0 0 / .45), 0 0 0 1px rgb(0 0 0 / .08);
}
.rs-player .rs-buffering::after {
border-radius: 50%; background: var(--rs-mark) center / 60% no-repeat, #ffffff;
box-shadow: 0 10px 24px -10px rgb(0 0 0 / .6);
}`;
  const directions = {
    mark: (s.wide ? `
/* ---------- direction: mark (wordmark), the logo rides on a play capsule ---------- */
.rs-player .rs-big {
display: inline-flex; align-items: center; gap: .85em;
width: auto; height: auto; min-height: max(58px, 3.8em); padding: .55em 1.25em .55em .6em;
border-radius: 999px; border: 1px solid color-mix(in srgb, var(--rs-text) 18%, transparent);
background: color-mix(in srgb, var(--rs-plate) 90%, transparent);
backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
box-shadow: 0 18px 40px -14px rgb(0 0 0 / .6);
}
.rs-player .rs-big svg {
flex: none; width: max(42px, 2.7em); height: max(42px, 2.7em); padding: .6em;
border-radius: 50%; background: var(--rs-accent); color: var(--rs-on-accent);
}
.rs-player .rs-big::after { content: none; }
/* the wordmark keeps its own proportions, so the capsule hugs it with no empty space */
.rs-player .rs-big-logo {
display: block; flex: none; height: 1.9em; width: auto;
max-width: min(12em, 40cqw); object-fit: contain; object-position: left center;
}
.rs-player .rs-big:hover { scale: 1.04; translate: none; }
.rs-player .rs-thumb { scale: 1; }${s.symbol ? `
.rs-player .rs-thumb {
width: 24px; height: 24px; border: 0; border-radius: 0; box-shadow: none;
background: var(--rs-mark) center / contain no-repeat;
filter: drop-shadow(0 2px 4px rgb(0 0 0 / .55));
}` : `
.rs-player .rs-thumb { width: 16px; height: 16px; border-radius: 50%; background: var(--rs-accent); box-shadow: 0 0 0 3px var(--rs-surface), 0 0 0 4.5px var(--rs-accent); }`}
.rs-player .rs-buffering::after {
width: ${s.symbol ? "3.6em" : "9em"}; height: ${s.symbol ? "3.6em" : "2.6em"}; border: 0; border-radius: 0;
background: ${s.symbol ? "var(--rs-mark)" : "var(--rs-logo)"} center / contain no-repeat;
}
.rs-player .rs-buffering[data-visible]::after { animation: rs-breathe 1.1s ease-in-out infinite alternate; }
@keyframes rs-breathe { from { scale: .9; opacity: .45; } to { scale: 1; opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .rs-player .rs-buffering[data-visible]::after { animation: none; } }` : `
/* ---------- direction: mark, the logo is the control ---------- */
.rs-player .rs-big {
position: relative; width: max(92px, 6.4em); height: max(92px, 6.4em); padding: 0;
border: 0; border-radius: 0; box-shadow: none;
background: var(--rs-mark) center / contain no-repeat;
backdrop-filter: none; -webkit-backdrop-filter: none;
filter: drop-shadow(0 14px 26px rgb(0 0 0 / .45));
}
.rs-player .rs-big::after { content: none; }
.rs-player .rs-big svg {
position: absolute; right: -6%; bottom: -6%; width: 40%; height: 40%; padding: 9%;
border-radius: 50%; background: var(--rs-accent); color: var(--rs-on-accent);
box-shadow: 0 0 0 3px var(--rs-surface);
}
.rs-player .rs-big:hover { scale: 1.06; translate: none; background-color: transparent; }
.rs-player .rs-thumb {
width: 24px; height: 24px; scale: 1; border: 0; border-radius: 0; box-shadow: none;
background: var(--rs-mark) center / contain no-repeat;
filter: drop-shadow(0 2px 4px rgb(0 0 0 / .55));
}
.rs-player .rs-buffering::after {
width: 3.6em; height: 3.6em; border: 0; border-radius: 0;
background: var(--rs-mark) center / contain no-repeat;
}
.rs-player .rs-buffering[data-visible]::after { animation: rs-breathe 1.1s ease-in-out infinite alternate; }
@keyframes rs-breathe { from { scale: .82; opacity: .5; } to { scale: 1; opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .rs-player .rs-buffering[data-visible]::after { animation: none; } }`) + markPlate,
    pattern: `
/* ---------- direction: pattern, the logo as texture ---------- */
.rs-player .rs-controls, .rs-transcript, .rs-menu { isolation: isolate; }
.rs-player .rs-controls::after, .rs-transcript::after, .rs-menu::after {
content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none;
border-radius: inherit;
background: var(--rs-logo) 0 0 / ${s.wide ? "auto 13px" : "26px 26px"} ${s.wide ? "space" : "repeat"};
opacity: .1;
}
.rs-player .rs-big { background-image: radial-gradient(circle at 30% 25%, color-mix(in srgb, #fff 22%, transparent), transparent 60%); }
.rs-player .rs-thumb { box-shadow: 0 0 0 3px var(--rs-surface), 0 0 0 5px var(--rs-bar); }`
  };
  return `/* Reskin: Video.js v10 skin, ${s.style} style, ${s.mode} mode${s.direction !== "none" ? ", " + s.direction + " direction" : ""} */\n${vars}\n${base}\n${styles[s.style]}\n${plateCSS}\n${directions[s.direction] || ""}\n${autoBlock}\n`;
}

/* ===================== markup ===================== */
function buildMarkup(s, o) {
  const I = (n, cls) => icon(s.icons, n, cls);
  const chTrack = (s.chapters || s.transcript) && o.ch ? `\n      <track kind="chapters" src="${o.ch}" srclang="en" label="Chapters" default>` : "";
  const logo = s.showLogo && o.logo ? `\n    <img class="rs-logo" src="${o.logo}" alt="">` : "";
  const fill = s.chapters
    ? `<media-time-slider-chapters class="rs-chapters">
          <template>
            <div class="rs-seg">
              <media-slider-track class="rs-track">
                <media-slider-buffer class="rs-buf"></media-slider-buffer>
                <media-slider-fill class="rs-fill"></media-slider-fill>
              </media-slider-track>
            </div>
          </template>
        </media-time-slider-chapters>`
    : `<media-slider-track class="rs-track">
          <media-slider-buffer class="rs-buf"></media-slider-buffer>
          <media-slider-fill class="rs-fill"></media-slider-fill>
        </media-slider-track>`;
  const rate = s.rate ? `\n          <button type="button" class="rs-btn rs-settings" commandfor="rs-settings" aria-label="Settings">
          ${I("settings", "rs-icon-settings")}
        </button>` : "";
  const radioItem = `<template>
            <media-menu-radio-item class="rs-menu-item">
              <span data-part="label"></span>
              <media-menu-item-indicator force-mount class="rs-menu-check">✓</media-menu-item-indicator>
            </media-menu-radio-item>
          </template>`;
  const menu = !s.rate ? "" : `

  <media-menu id="rs-settings" class="rs-menu" side="top" align="end">
    <media-menu-content class="rs-menu-root">
      <media-menu-item commandfor="rs-menu-speed" class="rs-menu-item"><span>Speed</span><span class="rs-menu-value"><span data-part="hint"></span><span aria-hidden="true">›</span></span></media-menu-item>
      <media-menu-item commandfor="rs-menu-subs" class="rs-menu-item"><span>Captions</span><span class="rs-menu-value"><span data-part="hint"></span><span aria-hidden="true">›</span></span></media-menu-item>
    </media-menu-content>
    <media-menu-content id="rs-menu-speed" class="rs-menu-panel">
      <media-menu-item class="rs-menu-back"><span aria-hidden="true">‹</span>Speed</media-menu-item>
      <media-playback-rate-radio-group class="rs-menu-group">
          ${radioItem}
      </media-playback-rate-radio-group>
    </media-menu-content>
    <media-menu-content id="rs-menu-subs" class="rs-menu-panel">
      <media-menu-item class="rs-menu-back"><span aria-hidden="true">‹</span>Captions</media-menu-item>
      <media-captions-radio-group class="rs-menu-group">
          ${radioItem}
      </media-captions-radio-group>
    </media-menu-content>
  </media-menu>`;

  const emb = !o.playbackId && rsEmbedOf(o.src);
  const player = `<video-player>
<media-container class="rs-player" tabindex="0">
  ${s.backfill ? `<canvas class="rs-backfill" width="48" height="27" aria-hidden="true"></canvas>
  ` : ""}${emb ? `<${emb.tag} src="${String(o.src).replace(/"/g, "&quot;")}" playsinline></${emb.tag}>` : o.playbackId ? `<mux-video src="https://stream.mux.com/${o.playbackId}.m3u8" crossorigin="anonymous" playsinline${o.caps[0] ? ` data-rs-cap="${o.caps[0][0]}"` : ""}>
    <video slot="media" crossorigin="anonymous" playsinline preload="metadata" poster="https://image.mux.com/${o.playbackId}/thumbnail.webp?time=1"></video>` : `<video src="${o.src}"${o.poster ? ` poster="${o.poster}"` : ""}${o.cors ? ` crossorigin="anonymous"` : ""} playsinline preload="metadata">`}
${emb ? "" : (o.playbackId ? [] : o.caps).map((c, i) => `      <track kind="${i ? "subtitles" : "captions"}" src="${c[0]}" srclang="${c[1]}" label="${c[2]}"${i ? "" : " default"}>`).join("\n")}
${emb ? "" : `${o.thumbs ? `      <track kind="metadata" label="thumbnails" src="${o.thumbs}" default>` : ""}${chTrack}
  ${o.playbackId ? "</mux-video>" : "</video>"}`}${logo}

  <media-buffering-indicator class="rs-buffering"></media-buffering-indicator>
  <div class="rs-center">
    <media-play-button class="rs-big">
      ${I("play", "rs-icon-play")}${I("replay", "rs-icon-replay")}${s.direction === "mark" && s.wide && o.logo ? `<img class="rs-big-logo" src="${o.logo}" alt="">` : ""}
    </media-play-button>
  </div>

  <media-controls>
    <media-controls-backdrop class="rs-backdrop"></media-controls-backdrop>
    <media-controls-content class="rs-controls">
      <media-time-slider class="rs-rail">
        ${fill}
        <media-slider-thumb class="rs-thumb"></media-slider-thumb>
        <media-slider-preview class="rs-preview">
          <media-slider-thumbnail class="rs-preview-thumb"></media-slider-thumbnail>
          <media-time-slider-chapter-title class="rs-preview-title"></media-time-slider-chapter-title>
          <media-slider-value class="rs-preview-time" type="pointer"></media-slider-value>
        </media-slider-preview>
      </media-time-slider>

      <media-controls-group class="rs-row">
        <media-play-button class="rs-btn rs-play">
          ${I("play", "rs-icon-play")}${I("pause", "rs-icon-pause")}${I("replay", "rs-icon-replay")}
        </media-play-button>
        <div class="rs-volume">
          <media-mute-button class="rs-btn">
            ${I("volume", "rs-icon-volume")}${I("muted", "rs-icon-muted")}
          </media-mute-button>
          <media-volume-slider class="rs-vol">
            <media-slider-track class="rs-vol-track">
              <media-slider-fill class="rs-vol-fill"></media-slider-fill>
            </media-slider-track>
            <media-slider-thumb class="rs-vol-thumb"></media-slider-thumb>
          </media-volume-slider>
        </div>
        <media-time-group class="rs-time">
          <media-time type="current"></media-time>
          <media-time-separator></media-time-separator>
          <media-time class="rs-time-dur" type="duration"></media-time>
        </media-time-group>
        <span class="rs-spacer"></span>
        <media-captions-button class="rs-btn">
          ${I("cc", "rs-icon-cc")}
        </media-captions-button>${rate}
        <media-fullscreen-button class="rs-btn">
          ${I("fsEnter", "rs-icon-enter")}${I("fsExit", "rs-icon-exit")}
        </media-fullscreen-button>
      </media-controls-group>
    </media-controls-content>
  </media-controls>${menu}

  <media-gesture type="tap" action="togglePaused" pointer="mouse" region="center"></media-gesture>
  <media-gesture type="doubletap" action="seekStep" value="-10" region="left"></media-gesture>
  <media-gesture type="doubletap" action="toggleFullscreen" region="center"></media-gesture>
  <media-gesture type="doubletap" action="seekStep" value="10" region="right"></media-gesture>
  <media-hotkey keys="Space" action="togglePaused"></media-hotkey>
  <media-hotkey keys="k" action="togglePaused"></media-hotkey>
  <media-hotkey keys="m" action="toggleMuted"></media-hotkey>
  <media-hotkey keys="c" action="toggleSubtitles"></media-hotkey>
  <media-hotkey keys="f" action="toggleFullscreen"></media-hotkey>
  <media-hotkey keys="ArrowLeft" action="seekStep" value="-5"></media-hotkey>
  <media-hotkey keys="ArrowRight" action="seekStep" value="5"></media-hotkey>
  <media-hotkey keys="0-9" action="seekToPercent"></media-hotkey>
</media-container>
</video-player>`;

  if (!s.transcript) return `<div class="rs-solo">\n${player}\n</div>`;
  const ind = player.split("\n").map(l => "  " + l).join("\n");
  return `<div class="rs-layout">
${ind}
<div class="rs-transcript" role="region" aria-label="Transcript">
  <div class="rs-tx-tabs" role="tablist">
    <button type="button" role="tab" data-rs-tab="captions" aria-selected="true">Transcript</button>
    <button type="button" role="tab" data-rs-tab="chapters" aria-selected="false">Chapters</button>${s.showLogo || s.direction === "mark" ? `
    <img class="rs-tx-brand" src="${o.logo}" alt="">` : ""}
  </div>
  <ol class="rs-tx-list"></ol>
</div>
</div>`;
}

