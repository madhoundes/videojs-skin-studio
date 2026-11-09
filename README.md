# Reskin

Upload a logo, pick a direction, and get a Video.js v10 player skin in your brand. Free and open source (Apache-2.0).

## What it does

- Reads a logo (SVG, PNG or JPG) in the browser: brand colors, corners, line weight, proportions.
- Wordmarks get their symbol cut out for the scrubber handle and the loader; the full logo stays on the play button, trimmed so the capsule hugs it.
- Dark logos sit on a white plate so they never vanish on a dark player.
- Three directions (Mark, Pattern, Signature), twelve presets, light, dark or auto.
- Captions in several languages, a transcript that follows along, chapters, scrub thumbnails, full keyboard control.
- Ships as two lines of code or an embed link. Optional Mux uploads with automatic captions.

## What is in this folder

| File | What it does |
|---|---|
| `index.html` | The landing page: drop in a logo and see the three directions and twelve presets in your brand |
| `studio.html` | The studio: every setting, live preview, and the "Get the code" drawer |
| `reskin.js` | One file with Video.js v10, the skin and Mux playback. Powers `<reskin-player>` and the embed page (385 KB, 116 KB gzipped) |
| `reskin-lite.js` | The same player without Mux, for plain video files like MP4 and WebM (248 KB, 74 KB gzipped). The studio hands this one out unless you use Mux |
| `embed.html` | The page an iframe or embed link points to. Reads the theme from the link |
| `src/` | Source for both builds. `core.js` is generated from `studio.html`, `brand.js` reads a logo for the landing page |
| `tools/extract-core.mjs` | Copies the skin builder out of `studio.html` into `src/core.js`, so the studio and the player never drift apart |
| `api/` | Two small Vercel functions that talk to Mux for video uploads |
| demo files | Test videos, captions (EN, AR, FR), chapters and thumbnails |

## Deploy on Vercel

1. Push this folder to a GitHub repo.
2. In Vercel: Add New, Project, import the repo.
3. Framework preset: Other. Leave the build command empty. `reskin.js` is already built.
4. Deploy. The landing page is your home page, the studio lives at `/studio`, and the code it hands out points to your own address.

## Turn on video uploads (Mux, optional)

Without this step everything works with video links. With it, people can upload a video in the studio and Mux hosts it, adds auto captions, storyboard thumbnails and a poster.

1. In Mux: Settings, Access Tokens, Generate new token. Environment: Production. Permission: Mux Video (Read and Write).
2. In Vercel: your project, Settings, Environment Variables. Add `MUX_TOKEN_ID` and `MUX_TOKEN_SECRET` with the two values from Mux.
3. Redeploy (Deployments, the latest one, Redeploy).

The keys live only in Vercel. They are never in this repo and never reach the browser.

Notes:
- Auto captions languages: English, Spanish, French, German, Italian, Portuguese, Turkish, Dutch. Arabic is not offered by Mux yet.
- Captions take a minute or two after the video is ready. The studio waits for them.
- The free Mux plan has limits on stored minutes. Check your Mux dashboard.

## Use it on a page

Website (two lines):

```html
<!-- a video file: the smaller build is enough -->
<script src="https://YOUR-SITE.vercel.app/reskin-lite.js"></script>
<reskin-player src="video.mp4" logo="logo.png" theme="r1.glass...."></reskin-player>

<!-- a video hosted on Mux: use the full build -->
<script src="https://YOUR-SITE.vercel.app/reskin.js"></script>
<reskin-player playback-id="MUX_PLAYBACK_ID" logo="logo.png" theme="r1.glass...."></reskin-player>
```

Embed (any site builder):

```html
<iframe src="https://YOUR-SITE.vercel.app/embed.html?theme=...&src=..." style="width:100%;aspect-ratio:16/9;border:0" allow="fullscreen; picture-in-picture" allowfullscreen></iframe>
```

The studio writes both for you. The theme code holds every setting, so nothing is stored on a server.

### Attributes

`playback-id` (Mux), `src`, `poster`, `logo`, `symbol`, `theme`, `captions` (`url|lang|Label, url|lang|Label`), `chapters`, `thumbnails`, `crossorigin`.

## Rebuild (only after changing the code)

```bash
npm install
npm run all     # core + bundle: studio.html -> src/core.js -> reskin.js and reskin-lite.js
```

`npm run core` regenerates `src/core.js` from `studio.html`. `npm run bundle` writes both bundles. The bundles are committed, so Vercel serves the folder as it is and runs no build step.

## Accessibility

Checked with axe-core 4.10 on the landing page and the studio (desktop, phone, light and dark) and on all twelve presets with four sample brands in light and dark: no violations. Every control works from the keyboard, focus is always visible, captions are light text on a dark plate, and motion turns off when the system asks for reduced motion.
