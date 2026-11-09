// Build: bundles Video.js and the skin into two files.
//   reskin.js       everything, including Mux playback (playback-id) and YouTube and Vimeo links
//   reskin-lite.js  the same player without Mux, YouTube or Vimeo, for plain video files (MP4, WebM). Much smaller.
import { build } from "esbuild";
import { readFileSync, writeFileSync, statSync } from "node:fs";

const parts = ["src/icons.js", "src/core.js", "src/codec.js", "src/element.js", "src/brand.js"].map(f => readFileSync(f, "utf8")).join("\n");
const vjs = readFileSync("src/vjs.js", "utf8");
const MUX = /^import "@videojs\/html\/media\/mux-video\/spf";\s*$/m;
if (!MUX.test(vjs)) throw new Error("src/vjs.js: the Mux import line was not found");
const EMBEDS = /^import "@videojs\/html\/media\/(youtube|vimeo)-video";\s*$/gm;

const banner = "/*! Reskin, a Video.js v10 skin builder. Apache-2.0. Includes Video.js (Apache-2.0), Lucide (ISC), Phosphor (MIT), Tabler (MIT) icons. */";
const targets = [
  { out: "reskin.js", entry: "src/.bundle-entry.js", source: vjs },
  { out: "reskin-lite.js", entry: "src/.bundle-entry-lite.js", source: vjs.replace(MUX, "").replace(EMBEDS, "") + "\nwindow.RESKIN_LITE = true;\n" }
];
for (const t of targets) {
  writeFileSync(t.entry, t.source + "\n" + parts);
  await build({ entryPoints: [t.entry], bundle: true, minify: true, format: "iife", target: ["es2020"], outfile: t.out, legalComments: "inline", banner: { js: banner } });
  console.log(`built ${t.out}  ${(statSync(t.out).size / 1024).toFixed(0)} KB`);
}
