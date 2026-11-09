/* Theme code: every Reskin setting packed into one short, link-safe string. */
const RS_CODES = {
  mode: { dark: "d", light: "l", auto: "a" },
  icons: { lucide: "lu", phosphor: "ph", phosphorFill: "pf", tabler: "tb" },
  font: { sans: "s", rounded: "r", serif: "e", mono: "m" },
  dir: { mark: "m", pattern: "p", signature: "s", none: "n" },
  aspect: { "16 / 9": "w", "9 / 16": "t", "1 / 1": "q" }
};
function rsEncode(s) {
  const h = x => String(x).replace("#", "").toLowerCase();
  const bits = [s.transcript, s.chapters, s.showLogo, s.rate, s.backfill, s.wide, s.logoLum < .45, !!s.symbol].map(b => (b ? 1 : 0)).join("");
  return ["r1", s.style, h(s.accent), h(s.bar), h(s.surface), h(s.text), h(s.surfaceL), h(s.textL),
    RS_CODES.mode[s.mode] || "d", RS_CODES.icons[s.icons] || "lu", RS_CODES.font[s.font] || "s",
    String(s.size).replace(".", "_"), s.radius, s.barH, RS_CODES.dir[s.direction] || "n",
    RS_CODES.aspect[s.aspect] || "w", bits].join(".");
}
function rsDecode(code) {
  const p = String(code || "").trim().split(".");
  if (p[0] !== "r1" || p.length < 17) return null;
  const inv = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [v, k]));
  const hex = x => /^[0-9a-f]{6}$/i.test(x) ? "#" + x : "#888888";
  const b = p[16].split("").map(x => x === "1");
  return {
    style: p[1], accent: hex(p[2]), bar: hex(p[3]), surface: hex(p[4]), text: hex(p[5]), surfaceL: hex(p[6]), textL: hex(p[7]),
    mode: inv(RS_CODES.mode)[p[8]] || "dark", icons: inv(RS_CODES.icons)[p[9]] || "lucide", font: inv(RS_CODES.font)[p[10]] || "sans",
    size: (p[11] || "14_5").replace("_", "."), radius: +p[12] || 0, barH: +p[13] || 4,
    direction: inv(RS_CODES.dir)[p[14]] || "none", aspect: inv(RS_CODES.aspect)[p[15]] || "16 / 9",
    transcript: b[0], chapters: b[1], showLogo: b[2], rate: b[3], backfill: b[4], wide: b[5], logoLum: b[6] ? .2 : .8, hasSymbol: b[7]
  };
}
