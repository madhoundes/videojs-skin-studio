/* Reskin.fromLogo: reads a logo the same way the studio does and returns ready-made looks.
   The core logo functions write to `state`, so this file owns that binding for the bundle. */
let state = {};

function rsLoadImage(url) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error("That file could not be read as an image."));
    im.src = url;
  });
}

async function rsFromLogo(url) {
  const img = await rsLoadImage(url);
  state = Object.assign({}, rsDecode(RS_DEFAULT_THEME), {
    logo: url, showLogo: true, direction: "mark", transcript: false, chapters: true, aspect: "16 / 9", mode: "dark", symbol: null
  });
  let pal = [];
  try { pal = extractPalette(img); } catch (e) { pal = []; }
  assignRoles(pal);
  let dna = null;
  try { dna = analyzeShape(img, pal); } catch (e) { dna = null; }
  state.dna = dna;
  state.wide = dna ? dna.wide : img.naturalWidth / (img.naturalHeight || 1) > 1.8;
  state.logoLum = dna ? dna.logoLum : .5;
  let symbol = null;
  try { symbol = state.wide && dna ? cropSymbol(img, dna.symBox) : null; } catch (e) { symbol = null; }
  const base = Object.assign({}, state);
  // look(direction, preset, mode, useSymbol): one finished skin plus its theme code.
  // A wide wordmark hands its symbol to the play button and the scrubber handle.
  const look = (direction = "mark", preset = "", mode = "dark", useSymbol = true) => {
    state = Object.assign({}, base, { symbol: useSymbol && symbol ? symbol : null });
    applyDirection(direction);
    if (preset && STYLE_DEFAULTS[preset]) Object.assign(state, STYLE_DEFAULTS[preset], { style: preset });
    state.mode = mode;
    const s = Object.assign({}, state);
    delete s.dna;
    return { state: s, theme: rsEncode(s), symbol: s.symbol || "" };
  };
  return {
    palette: pal.map(p => p.hex),
    roles: { accent: base.accent, bar: base.bar, surface: base.surface, surfaceL: base.surfaceL },
    chips: dna ? dna.chips : [],
    summary: dna ? dna.text : "",
    wide: base.wide,
    symbol,
    look
  };
}

Object.assign(window.Reskin, {
  fromLogo: rsFromLogo,
  presets: Object.keys(STYLE_DEFAULTS).map(id => ({ id, name: PRESET_NAMES[id], ...STYLE_DEFAULTS[id] }))
});
