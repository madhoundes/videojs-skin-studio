// Regenerates src/core.js from studio.html, so the studio and <reskin-player> share one skin builder.
// Run it after changing the skin code in studio.html:  npm run core   (then npm run bundle)
import { readFileSync, writeFileSync } from "node:fs";

const lines = readFileSync(new URL("../studio.html", import.meta.url), "utf8").split("\n");
const find = prefix => {
  const i = lines.findIndex(l => l.startsWith(prefix));
  if (i < 0) throw new Error("studio.html changed shape, marker not found: " + prefix);
  return i;
};
// strip the two-space indent the studio uses inside its main script block
const ded = ls => ls.map(l => (l.startsWith("  ") ? l.slice(2) : l));

const helpersStart = find("// A wordmark often comes");     // top-level helpers: trim, backfill, transcript
const helpersEnd = find("(() => {");                        // the studio's own script starts here
const fonts = find("  const FONTS = {");                    // fonts, icon sets, style defaults
const svg = find("  function svgFrom");                     // icon helpers
const ui = find("  const ui = ");
const colors = find("  const hexToRgb");                    // color utilities
const hue = find("  function applyHue");
const reader = find("  /* read the logo");                  // logo reader: shape, symbol, palette
const skin = find("  /* ===================== skin CSS");
const css = find("  function buildCSS");                    // buildCSS and buildMarkup
const exportFn = find("  function buildExportHTML");

const core = [
  "/* Reskin core: the skin builder shared by the studio and <reskin-player>. Generated from studio.html by tools/extract-core.mjs. */",
  ...lines.slice(helpersStart, helpersEnd),
  ...ded(lines.slice(fonts, svg)),
  ...ded(lines.slice(svg, ui)),
  ...ded(lines.slice(colors, hue)),
  ...ded(lines.slice(reader, skin)),
  ...ded(lines.slice(css, exportFn))
];
writeFileSync(new URL("../src/core.js", import.meta.url), core.join("\n") + "\n");
console.log("src/core.js written,", core.length, "lines");
